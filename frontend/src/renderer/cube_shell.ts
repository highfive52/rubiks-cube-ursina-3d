import * as THREE from 'three'
import { createCubie } from './cubie'

export function createCubeShell(cubieSize = 0.95, gap = 0.05) {
  const parent = new THREE.Object3D()
  const step = cubieSize + gap

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        const cubie = createCubie(cubieSize)
        cubie.position.set((x - 1) * step, (y - 1) * step, (z - 1) * step)
        parent.add(cubie)
      }
    }
  }

  return parent
}
