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
    parent.add(cubie)
  }

  return parent
}
