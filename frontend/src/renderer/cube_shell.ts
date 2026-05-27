import * as THREE from 'three'
import { createCubie } from './cubie'
import type { GridPos } from './cubie'
import CubeModel from '../model/cube_model'
import CUBE_CONFIG from '../config'

export function createCubeShell(model: CubeModel) {
  const parent = new THREE.Object3D()

  const gridSize = CUBE_CONFIG.GRID_SIZE
  const size = CUBE_CONFIG.CUBIE_SIZE
  const gap = CUBE_CONFIG.GAP

  const step = size + gap
  const offset = (gridSize - 1) / 2

  for (const [, data] of model.cubes) {
    const { x, y, z } = data.gridPos

    const pos: GridPos = { x, y, z }
    const cubie = createCubie(size, pos)
    cubie.position.set((x - offset) * step, (y - offset) * step, (z - offset) * step)
    // Attach stable id to mesh so renderer can map meshes to model entries
    ;(cubie as any).userData = (cubie as any).userData || {}
    ;(cubie as any).userData.id = data.id
    parent.add(cubie)
  }

  return parent
}

// Find a mesh in the shell by its grid position
export function findMeshByGridPos(root: THREE.Object3D, gridPos: GridPos) {
  let found: THREE.Object3D | null = null
  root.traverse((o: any) => {
    if (found) return
    if (o && o.gridPosition) {
      const p = o.gridPosition
      if (p.x === gridPos.x && p.y === gridPos.y && p.z === gridPos.z) {
        found = o
      }
    }
  })
  return found as THREE.Object3D | null
}

