// OrbitControls declaration removed — using TrackballControls in this project.

declare module 'three/examples/jsm/controls/TrackballControls.js' {
  import { Camera, EventDispatcher, Vector3 } from 'three'

  export class TrackballControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement)
    update(): void
    dispose(): void
    enabled: boolean
    rotateSpeed: number
    zoomSpeed: number
    panSpeed: number
    staticMoving: boolean
    dynamicDampingFactor: number
    target: Vector3
    saveState(): void
    reset(): void
  }
}
