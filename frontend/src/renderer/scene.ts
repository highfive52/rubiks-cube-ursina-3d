import * as THREE from 'three'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import { createCamera, resizeCamera } from './camera'
import { addLights } from './lighting'
import { createCubeShell } from './cube_shell'

type SceneHandle = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: TrackballControls
  start: () => void
  stop: () => void
}

export function initScene(container: HTMLElement): SceneHandle {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap at 2 for perf on retina screens
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const camera = createCamera(container.clientWidth / container.clientHeight)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)

  addLights(scene)

  const cube = createCubeShell()
  cube.rotation.set(0, 0, 0)
  cube.quaternion.identity()
  scene.add(cube)

  const controls = new TrackballControls(camera, renderer.domElement)
  // TrackballControls: tune speeds and damping
  controls.rotateSpeed = 1.2
  controls.zoomSpeed = 1.0
  // Disable panning by setting panSpeed to 0 (we want a locked pivot)
  controls.panSpeed = 0
  controls.staticMoving = false
  controls.dynamicDampingFactor = 0.2
  // Keep the cube centered as the orbit target
  controls.target.set(0, 0, 0)

  // TrackballControls handles input internally; no explicit mouse/touch mapping required here.

  // Handle resizing based on container element, not the whole window
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect
      resizeCamera(camera, width, height)
      renderer.setSize(width, height)
    }
  })
  resizeObserver.observe(container)

  let animationFrameId: number | null = null
  let running = true

  function animate() {
    if (!running) return
    animationFrameId = requestAnimationFrame(animate)
    
    controls.update()
    renderer.render(scene, camera)
  }

  animate()

  return {
    scene,
    renderer,
    camera,
    controls,
    start() {
      if (!running) {
        running = true
        animate()
      }
    },
    stop() {
      running = false
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      
      // Clean up Observers and Event Listeners
      resizeObserver.disconnect()

      // Clean up Controls
      controls.dispose()

      // Clean up WebGL Context & DOM
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      // Optional: If you aren't reusing the scene elsewhere, 
      // you should traverse the scene here and dispose of cube geometries/materials.
    }
  }
}