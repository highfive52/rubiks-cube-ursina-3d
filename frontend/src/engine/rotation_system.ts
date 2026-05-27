import * as THREE from 'three'
import type CubeModel from '../model/cube_model'
import CUBE_CONFIG from '../config'
import type { MoveIntent } from './move_intent'
import { findMeshByGridPos } from '../renderer/cube_shell'

export class RotationSystem {
  private scene: THREE.Scene
  private shellRoot: THREE.Object3D
  private model: CubeModel
  private animating = false

  constructor(scene: THREE.Scene, shellRoot: THREE.Object3D, model: CubeModel) {
    this.scene = scene
    this.shellRoot = shellRoot
    this.model = model
  }

  async executeIntent(intent: MoveIntent) {
    console.debug('[RotationSystem] executeIntent', intent)
    if (this.animating) return Promise.reject(new Error('Rotation in progress'))
    this.animating = true

    // For Phase 8: select cubies by face slice for all six faces
    const toRotate: THREE.Object3D[] = []

    for (const [, data] of this.model.cubes) {
      const { x, y, z } = data.gridPos
      let match = false
      switch (intent.face) {
        // Note: frontend face letters map to normals where 'F' is -Z (front), 'B' is +Z (back)
        case 'F':
          match = z === 0
          break
        case 'B':
          match = z === 2
          break
        case 'R':
          match = x === 2
          break
        case 'L':
          match = x === 0
          break
        case 'U':
          match = y === 2
          break
        case 'D':
          match = y === 0
          break
      }
      if (match) {
        const mesh = findMeshByGridPos(this.shellRoot, { x, y, z } as any)
        if (mesh) toRotate.push(mesh)
      }
    }

    console.debug('[RotationSystem] selected meshes', toRotate.map((m) => (m as any).gridPosition), 'count', toRotate.length)
    if (!toRotate.length) {
      this.animating = false
      return Promise.resolve()
    }

    // Create rotation group
    const group = new THREE.Object3D()
    this.scene.add(group)

    // compute world pivot center
    const bbox = new THREE.Box3()
    toRotate.forEach((m) => bbox.expandByObject(m))
    const center = bbox.getCenter(new THREE.Vector3())
    group.position.copy(center)

    // reparent selected meshes into group, preserving world transforms
    const tmpVec = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    for (const m of toRotate) {
      // capture world position and rotation
      m.getWorldPosition(tmpVec)
      m.getWorldQuaternion(tmpQuat)

      // compute local position relative to group center
      const localPos = tmpVec.clone().sub(center)

      group.add(m)
      m.position.copy(localPos)
      m.quaternion.copy(tmpQuat)
    }

    // Choose base axis vector (unit) based on face
    let axis = new THREE.Vector3(0, 0, 1)
    let axisName: 'x' | 'y' | 'z' = 'z'
    switch (intent.face) {
      case 'F':
      case 'B':
        axis = new THREE.Vector3(0, 0, 1)
        axisName = 'z'
        break
      case 'R':
      case 'L':
        axis = new THREE.Vector3(1, 0, 0)
        axisName = 'x'
        break
      case 'U':
      case 'D':
        axis = new THREE.Vector3(0, 1, 0)
        axisName = 'y'
        break
    }

    // Compute centroid of selected coords to determine layer sign
    const coords = toRotate.map((m) => (m as any).gridPosition as [number, number, number])
    const centroid = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]).map((v) => v / coords.length) as [number, number, number]
    const gridCenter = (CUBE_CONFIG.GRID_SIZE - 1) / 2
    const layerCoord = axisName === 'x' ? centroid[0] - gridCenter : axisName === 'y' ? centroid[1] - gridCenter : centroid[2] - gridCenter

    // Compute world-space axis by applying shellRoot world quaternion
    const shellQuat = new THREE.Quaternion()
    this.shellRoot.getWorldQuaternion(shellQuat)
    const worldAxis = axis.clone().applyQuaternion(shellQuat).normalize()

    // Ursina visual_degrees rule: positive direction -> 90deg * direction,
    // then flip sign for certain axis/layer combinations so visual rotation
    // matches the canonical Python renderer.
    let angle = (Math.PI / 2) * intent.direction
    // Flip sign for positive-layer x/y faces (right/top) and positive z (back)
    if ((axisName === 'x' && layerCoord > 0) || (axisName === 'y' && layerCoord > 0) || (axisName === 'z' && layerCoord > 0)) {
      angle = -angle
    }

    // animate 90 degrees over 300ms
    const duration = 300
    const start = performance.now()

    console.debug('[RotationSystem] executeIntent axis', axisName, 'centroid', centroid, 'layerCoord', layerCoord, 'angle', angle)
    return new Promise<void>((resolve) => {
      let lastP = 0
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        const deltaP = p - lastP
        lastP = p
        // rotate incrementally around the world axis so signCorrection aligns with visual
        group.rotateOnWorldAxis(worldAxis, angle * deltaP)
        if (p < 1) requestAnimationFrame(tick)
        else {
          // finalize: reparent meshes back to shellRoot preserving world transforms
          for (const m of [...group.children]) {
            const child = m as THREE.Object3D
            const worldPos = new THREE.Vector3()
            const worldQuat = new THREE.Quaternion()
            child.getWorldPosition(worldPos)
            child.getWorldQuaternion(worldQuat)

            group.remove(child)
            this.shellRoot.add(child)

            // convert world pos to shellRoot local and apply world quaternion
            this.shellRoot.worldToLocal(worldPos)
            child.position.copy(worldPos)
            child.quaternion.copy(worldQuat)
          }
          this.scene.remove(group)
          // TODO: compute remap and update model.cubes via applyRemap
          this.animating = false
          resolve()
        }
      }

      requestAnimationFrame(tick)
    })
  }

  // Execute a change object produced by MoveEngine.apply
  async executeChange(change: any, opts: { speed?: number; on_complete?: () => void } = {}) {
    const move = change.move
    const affected: Array<[number, number, number]> = change.affected || []
    console.debug('[RotationSystem] executeChange', { move, affected })
    if (this.animating) return Promise.reject(new Error('Rotation in progress'))
    this.animating = true

    const toRotate: THREE.Object3D[] = []
    for (const coord of affected) {
      const [x, y, z] = coord
      const mesh = findMeshByGridPos(this.shellRoot, { x, y, z } as any)
      if (mesh) toRotate.push(mesh)
    }

    console.debug('[RotationSystem] selected meshes', toRotate.map((m) => (m as any).gridPosition), 'count', toRotate.length)
    if (!toRotate.length) {
      this.animating = false
      opts.on_complete && opts.on_complete()
      return Promise.resolve()
    }

    const group = new THREE.Object3D()
    this.scene.add(group)

    const bbox = new THREE.Box3()
    toRotate.forEach((m) => bbox.expandByObject(m))
    const center = bbox.getCenter(new THREE.Vector3())
    group.position.copy(center)

    // reparent preserving world transforms
    const worldPos = new THREE.Vector3()
    const worldQuat = new THREE.Quaternion()
    for (const m of toRotate) {
      m.getWorldPosition(worldPos)
      m.getWorldQuaternion(worldQuat)
      const localPos = worldPos.clone().sub(center)
      group.add(m)
      m.position.copy(localPos)
      m.quaternion.copy(worldQuat)
    }

    // Determine base axis vector (unit) from move.axis
    let axis = new THREE.Vector3(0, 0, 1)
    if (move && move.axis) {
      if (move.axis === 'x') axis = new THREE.Vector3(1, 0, 0)
      else if (move.axis === 'y') axis = new THREE.Vector3(0, 1, 0)
      else if (move.axis === 'z') axis = new THREE.Vector3(0, 0, 1)
    }

    // Compute world-space axis by applying shellRoot world quaternion
    const shellQuat = new THREE.Quaternion()
    this.shellRoot.getWorldQuaternion(shellQuat)
    const worldAxis = axis.clone().applyQuaternion(shellQuat).normalize()

    // Ursina visual_degrees rule (match Python renderer): base 90deg * direction
    // and flip depending on axis + layerCoord sign
    const coords2 = toRotate.map((m) => (m as any).gridPosition as [number, number, number])
    const centroid2 = coords2.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]).map((v) => v / coords2.length) as [number, number, number]
    const layerCoord2 = axis.x === 1 ? centroid2[0] - (CUBE_CONFIG.GRID_SIZE - 1) / 2 : axis.y === 1 ? centroid2[1] - (CUBE_CONFIG.GRID_SIZE - 1) / 2 : centroid2[2] - (CUBE_CONFIG.GRID_SIZE - 1) / 2

    let angle = (Math.PI / 2) * (move.direction || 1)
    // Flip sign for positive layer on x/y (right/top) and positive z (back)
    if ((axis.x === 1 && layerCoord2 > 0) || (axis.y === 1 && layerCoord2 > 0) || (axis.z === 1 && layerCoord2 > 0)) {
      angle = -angle
    }
    const duration = (change.meta && change.meta.duration_hint ? change.meta.duration_hint : 0.3) * 1000
    const start = performance.now()

    console.debug('[RotationSystem] executeChange computed', { move, axis: axis.toArray(), worldAxis: worldAxis.toArray(), angle })

    return new Promise<void>((resolve) => {
      let lastP = 0
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        const deltaP = p - lastP
        lastP = p
        group.rotateOnWorldAxis(worldAxis, angle * deltaP)
        if (p < 1) requestAnimationFrame(tick)
        else {
          for (const m of [...group.children]) {
            const child = m as THREE.Object3D
            const wp = new THREE.Vector3()
            const wq = new THREE.Quaternion()
            child.getWorldPosition(wp)
            child.getWorldQuaternion(wq)
            group.remove(child)
            this.shellRoot.add(child)
            this.shellRoot.worldToLocal(wp)
            child.position.copy(wp)
            child.quaternion.copy(wq)
          }
          this.scene.remove(group)
          this.animating = false
          opts.on_complete && opts.on_complete()
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })
  }
}

export default RotationSystem
