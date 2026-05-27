import * as THREE from 'three'

export function addLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 0.8)
  dir.position.set(5, 10, 7.5)
  scene.add(dir)
}
