import type * as THREE from 'three'
import type CubeModel from '../model/cube_model'

declare global {
  interface Window {
    __RUBIKS_DEBUG?: {
      scene?: THREE.Scene
      model?: CubeModel
      cubeGroup?: THREE.Object3D
    }
  }
}

export function exposeDebug(opts: { scene?: THREE.Scene; model?: any; cubeGroup?: THREE.Object3D }) {
  ;(window as any).__RUBIKS_DEBUG = Object.assign((window as any).__RUBIKS_DEBUG || {}, opts)

  // Attach a convenience helper to print a compact sample of the runtime state
  function printSample() {
    const dbg = (window as any).__RUBIKS_DEBUG || {}
    const scene: THREE.Scene | undefined = dbg.scene
    const model = dbg.model
    const cubeGroup: THREE.Object3D | undefined = dbg.cubeGroup

    const cubies: any[] = []
    if (scene) {
      scene.traverse((o: any) => {
        if (o && o.gridPosition) cubies.push(o)
      })
    }

    console.group('RUBIKS_DEBUG')
    console.log('modelSize:', model && typeof model.snapshot === 'function' ? model.snapshot().size : 'n/a')
    console.log('cubiesInScene:', cubies.length)
    if (cubies.length) {
      const sample = cubies.slice(0, 9).map((c) => ({ gridPosition: c.gridPosition, position: c.position?.toArray ? c.position.toArray() : c.position }))
      console.log('sampleCubies (up to 9):', sample)
    }
    if (cubeGroup) console.log('cubeGroup children:', cubeGroup.children.length)
    console.groupEnd()
  }

  ;(window as any).__RUBIKS_DEBUG.printSample = printSample
}

export default exposeDebug
