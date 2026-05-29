import * as THREE from 'three'
import { computeFaceContext, resolveScreenAxes, computeAdjacentFaces } from './camera_face_resolver'

export default class CameraTracker {
  camera: THREE.Camera
  object?: THREE.Object3D

  constructor(camera: THREE.Camera, object?: THREE.Object3D) {
    this.camera = camera
    this.object = object
  }

  // Return face context: face, rightAxis, upAxis
  getFaceContext() {
    return computeFaceContext(this.camera, this.object)
  }

  // Return resolver used by InputController
  getScreenAxes() {
    const res = resolveScreenAxes(this.camera, this.object)

    // Compute a representative world-space normal for the face by
    // sampling an outer-layer cubie mesh's world quaternion. This
    // matches the `lastHoveredNormalWorld` used by the click path and
    // avoids discrepancies caused by per-cubie orientations.
    try {
      if (this.object) {
        // Gather grid bounds from child meshes that expose `gridPosition`
        let minX = Infinity,
          minY = Infinity,
          minZ = Infinity
        let maxX = -Infinity,
          maxY = -Infinity,
          maxZ = -Infinity
        const meshes: any[] = []
        this.object.traverse((o: any) => {
          if (o && o.gridPosition) {
            const gp = o.gridPosition
            meshes.push(o)
            if (gp.x < minX) minX = gp.x
            if (gp.x > maxX) maxX = gp.x
            if (gp.y < minY) minY = gp.y
            if (gp.y > maxY) maxY = gp.y
            if (gp.z < minZ) minZ = gp.z
            if (gp.z > maxZ) maxZ = gp.z
          }
        })

        const faceToTest = res.face
        const targetCoord: { axis: 'x' | 'y' | 'z'; value: number } | null = (() => {
          switch (faceToTest) {
            case 'R':
              return { axis: 'x', value: maxX }
            case 'L':
              return { axis: 'x', value: minX }
            case 'U':
              return { axis: 'y', value: maxY }
            case 'D':
              return { axis: 'y', value: minY }
            case 'F':
              return { axis: 'z', value: minZ }
            case 'B':
              return { axis: 'z', value: maxZ }
          }
        })()

        if (targetCoord && meshes.length > 0 && isFinite(targetCoord.value)) {
          for (const m of meshes) {
            const gp = m.gridPosition
            if (gp && gp[targetCoord.axis] === targetCoord.value) {
              // Found a representative mesh on the outer layer for this face
              const q = new THREE.Quaternion()
              m.getWorldQuaternion(q)
              const canonical = (() => {
                switch (faceToTest) {
                  case 'R':
                    return new THREE.Vector3(1, 0, 0)
                  case 'L':
                    return new THREE.Vector3(-1, 0, 0)
                  case 'U':
                    return new THREE.Vector3(0, 1, 0)
                  case 'D':
                    return new THREE.Vector3(0, -1, 0)
                  case 'F':
                    return new THREE.Vector3(0, 0, -1)
                  case 'B':
                    return new THREE.Vector3(0, 0, 1)
                }
              })()
              if (canonical) {
                canonical.applyQuaternion(q).normalize()
                ;(res as any).representativeFaceNormalWorld = [canonical.x, canonical.y, canonical.z]
                break
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore sampling failures; caller will fall back to faceNormalsWorld
    }

    return res
  }

  getAdjacentFaces() {
    const face = resolveScreenAxes(this.camera, this.object).face
    return computeAdjacentFaces(face)
  }
}
