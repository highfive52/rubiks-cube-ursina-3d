import * as THREE from 'three'
import { FACE_LETTER_TO_TUPLE, FACE_NORMALS_MAP } from '../input/face_mappings'

export type GridPos = { x: number; y: number; z: number }

export type CubieMesh = THREE.Mesh & { gridPosition?: GridPos }

export function createCubie(size = 0.95, gridPos?: GridPos) {
  const geometry = new THREE.BoxGeometry(size, size, size)
  // Use canonical face mappings so colors match Python `FACE_MAPPINGS`.
  // Box material order: +X, -X, +Y, -Y, +Z, -Z
  // Map letters in that order to colors: R, L, U, D, B, F
  const letters: Array<'R' | 'L' | 'U' | 'D' | 'B' | 'F'> = ['R', 'L', 'U', 'D', 'B', 'F']

  const faceColors = letters.map((l) => {
    const tuple = FACE_LETTER_TO_TUPLE[l]
    const key = tuple ? `${tuple[0]},${tuple[1]},${tuple[2]}` : null
    const info = key ? FACE_NORMALS_MAP[key] : null
    return info ? info.color : 0x888888
  })

  const materials = faceColors.map((c) => new THREE.MeshStandardMaterial({ color: c }))

  const mesh = new THREE.Mesh(geometry, materials) as CubieMesh

  if (gridPos) {
    mesh.gridPosition = gridPos
  }

  return mesh
}
