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
    return res
  }

  getAdjacentFaces() {
    const face = resolveScreenAxes(this.camera, this.object).face
    return computeAdjacentFaces(face)
  }
}
