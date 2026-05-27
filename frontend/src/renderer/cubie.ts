import * as THREE from 'three'

export function createCubie(size = 0.95) {
  const geometry = new THREE.BoxGeometry(size, size, size)

  // Standard Rubik's face colors: +X, -X, +Y, -Y, +Z, -Z (order doesn't strictly matter for prototype)
  const faceColors = [0xff0000, 0xffa500, 0xffff00, 0xffffff, 0x0000ff, 0x00ff00]
  const materials = faceColors.map((c) => new THREE.MeshStandardMaterial({ color: c }))

  const mesh = new THREE.Mesh(geometry, materials)
  return mesh
}
