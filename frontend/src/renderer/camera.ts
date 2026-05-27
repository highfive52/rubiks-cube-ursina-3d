import * as THREE from 'three'

export function createCamera(aspect = 1) {
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200)
  // Start the camera further back so the whole cube is visible on load
  camera.position.set(0, 0, 15)
  camera.lookAt(0, 0, 0)
  return camera
}

export function resizeCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
