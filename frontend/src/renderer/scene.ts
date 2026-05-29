import * as THREE from 'three'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import { createCamera, resizeCamera } from './camera'
import { addLights } from './lighting'
import { createCubeShell, findMeshByGridPos } from './cube_shell'
import { axisTupleToFace, resolveScreenAxes } from '../input/camera_face_resolver'
import { FACE_NORMALS_MAP, FACE_LETTER_TO_TUPLE } from '../input/face_mappings'
import CameraTracker from '../input/camera_tracker'
import InputController from '../input/input_controller'
import RotationSystem from '../engine/rotation_system'
import MoveEngine from '../engine/move_engine'
import CubeController from '../engine/cube_controller'
import CubeModel from '../model/cube_model'
import CUBE_CONFIG from '../config'
import { exposeDebug } from './debug'

import { DEBUG } from '../config'

// Suppress verbose debug output unless DEBUG flag enabled. Toggle by
// starting the dev server with `http://localhost:5173/?debug=1`.
if (!DEBUG) {
  console.debug = () => {}
  console.log = () => {}
}

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

  // Camera face HUD (shows which face camera is currently pointing at)
  const faceHud = document.createElement('div')
  faceHud.style.position = 'absolute'
  faceHud.style.left = '12px'
  faceHud.style.top = '12px'
  faceHud.style.padding = '6px 10px'
  faceHud.style.background = 'rgba(0,0,0,0.6)'
  faceHud.style.color = '#fff'
  faceHud.style.fontFamily = 'monospace'
  faceHud.style.fontSize = '14px'
  faceHud.style.borderRadius = '4px'
  faceHud.style.zIndex = '999'
  faceHud.textContent = ''
  // ensure container is positioned so absolute children are placed correctly
  const prevPos = getComputedStyle(container).position
  if (prevPos === 'static') container.style.position = 'relative'
  container.appendChild(faceHud)

  const camera = createCamera(container.clientWidth / container.clientHeight)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)

  addLights(scene)

  const model = new CubeModel(CUBE_CONFIG.GRID_SIZE)
  const cube = createCubeShell(model)
  cube.rotation.set(0, 0, 0)
  cube.quaternion.identity()
  scene.add(cube)

  // Expose runtime objects for easier dev console inspection
  try {
    exposeDebug({ scene, model, cubeGroup: cube })
  } catch (e) {
    // debug is dev-only; fail silently in production builds
  }

  const controls = new TrackballControls(camera, renderer.domElement)
  // TrackballControls: tune speeds and damping
  // Increase rotateSpeed for more responsive rotation (was too slow)
  controls.rotateSpeed = 10.0
  controls.zoomSpeed = 1.0
  // Disable panning by setting panSpeed to 0 (we want a locked pivot)
  controls.panSpeed = 0
  // Use static moving for snappier input and keep modest damping
  controls.staticMoving = true
  controls.dynamicDampingFactor = 0.15
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
    // Update camera face HUD
    try {
      // Use the screen-axes resolver which maps camera right/up to nearest
      // cube face normals (discrete tuples). This avoids transient gaps
      // when rounding raw vectors during rotation.
      const axesRes = resolveScreenAxes(camera, cube)
      const letter = axesRes.face
      const tuple = FACE_LETTER_TO_TUPLE[letter]
      const key = tuple ? `${tuple[0]},${tuple[1]},${tuple[2]}` : null
      const info = key ? FACE_NORMALS_MAP[key] : null
      const tupleText = tuple ? ` [${tuple[0]},${tuple[1]},${tuple[2]}]` : ''

      const rightTuple = axesRes.screenRightAxis
      const upTuple = axesRes.screenUpAxis
      const rightKey = rightTuple ? `${rightTuple[0]},${rightTuple[1]},${rightTuple[2]}` : null
      const upKey = upTuple ? `${upTuple[0]},${upTuple[1]},${upTuple[2]}` : null
      const rightInfo = rightKey ? FACE_NORMALS_MAP[rightKey] : null
      const upInfo = upKey ? FACE_NORMALS_MAP[upKey] : null

      let text = info ? `Face: ${info.side} (${info.color_name})${tupleText}` : `Face: ${letter}${tupleText}`
      const rightText = rightInfo ? `${rightInfo.side} (${rightInfo.color_name}) [${rightTuple![0]},${rightTuple![1]},${rightTuple![2]}]` : `? ${rightTuple ? `[${rightTuple[0]},${rightTuple[1]},${rightTuple[2]}]` : ''}`
      const upText = upInfo ? `${upInfo.side} (${upInfo.color_name}) [${upTuple![0]},${upTuple![1]},${upTuple![2]}]` : `? ${upTuple ? `[${upTuple[0]},${upTuple[1]},${upTuple[2]}]` : ''}`
      text += `\nRight: ${rightText} | Up: ${upText}`
      // Append hovered face (mouse-over) info when available
      if (hoveredFace) {
        const htuple = FACE_LETTER_TO_TUPLE[hoveredFace]
        const hkey = htuple ? `${htuple[0]},${htuple[1]},${htuple[2]}` : null
        const hinfo = hkey ? FACE_NORMALS_MAP[hkey] : null
        const htext = hinfo ? `${hinfo.side} (${hinfo.color_name})` : `${hoveredFace}`
        const htupleText = htuple ? ` [${htuple[0]},${htuple[1]},${htuple[2]}]` : ''
        text += ` | Hover: ${htext}${htupleText}`
        faceHud.style.background = 'rgba(0,0,0,0.6)'
      } else {
        if (info) faceHud.style.background = 'rgba(0,0,0,0.6)'
      }
      faceHud.textContent = text
    } catch (e) {
      // ignore
    }
    renderer.render(scene, camera)
  }

  animate()

  // Phase 8: wire input -> engine -> controller -> rotation system
  const rotationSystem = new RotationSystem(scene, cube, model)
  const moveEngine = new MoveEngine(model)
  const controller = new CubeController(moveEngine, model, (_before, _after, meta, opts) => {
    // If this is a post-commit notification, resync mesh gridPositions
    if (opts && (opts as any).committed) {
      try {
        const after = _after
        // Build id -> gridPos map from model snapshot
        const idMap: Record<string, { x: number; y: number; z: number }> = {}
        if (after && typeof after === 'object' && (after as Map<string, any>) instanceof Map) {
          for (const [, d] of (after as Map<string, any>)) {
            if (d && d.id) idMap[String(d.id)] = d.gridPos
          }
        }

        // Update each mesh's gridPosition from idMap and snap its position to grid
        const gridSize = CUBE_CONFIG.GRID_SIZE
        const size = CUBE_CONFIG.CUBIE_SIZE
        const gap = CUBE_CONFIG.GAP
        const step = size + gap
        const offset = (gridSize - 1) / 2

        cube.traverse((o: any) => {
          if (o && o.gridPosition) {
            const meshId = (o.userData && o.userData.id) ? String(o.userData.id) : `${o.gridPosition.x},${o.gridPosition.y},${o.gridPosition.z}`
            const newPos = idMap[meshId]
            if (newPos) {
              o.gridPosition = { x: newPos.x, y: newPos.y, z: newPos.z }
              // snap visual position to grid-aligned coordinates
              o.position.set((newPos.x - offset) * step, (newPos.y - offset) * step, (newPos.z - offset) * step)
              // Keep existing orientation — mesh quaternions were preserved
              // during animation reparenting so stickers stay rotated with cubies.
            }
          }
        })
          // Verification: ensure each model entry maps to a mesh and mesh gridPositions align
          try {
            // Use debug verifier (throws in DEBUG) to detect mismatches
            // `after` is a Map snapshot produced by the controller.
            // Run verification only in DEBUG mode to avoid noisy errors during
            // normal usage. The verifier throws in DEBUG to aid development.
            if (DEBUG) {
              try {
                import('../debug/verify')
                  .then((m) => {
                    try {
                      if (after && (after as any) instanceof Map) m.verifyModelMeshSyncFromSnapshot(after as Map<string, any>, cube)
                    } catch (err) {
                      console.warn('resync-verify failed', err)
                    }
                  })
                  .catch((err) => console.warn('resync-verify import failed', err))
              } catch (e) {
                console.warn('resync-verify failed', e)
              }
            }
          } catch (e) {
            console.warn('resync-verify failed', e)
          }
      } catch (e) {
        console.warn('resync meshes failed', e)
      }
      return
    }

    // opts: { move, affected, speed, on_complete }
    rotationSystem.executeChange({ move: opts?.move, affected: opts?.affected, meta }, { speed: opts?.speed, on_complete: opts?.on_complete }).catch((err) => {
      console.warn('Rotation failed', err)
      opts?.on_complete && opts.on_complete()
    })
  })


  // ############################################################
  // Use CameraTracker to compute camera-relative axes
  const tracker = new CameraTracker(camera, cube)

  const inputController = new InputController()
  
  inputController.setScreenAxesResolver(() => tracker.getScreenAxes())
  inputController.start((payload, direction) => {
    console.debug('[Scene] intent received', { payload, direction })
    // forward to controller which handles engine/model/renderer sequence
    controller.apply_rotate(payload, direction)
  })

  // Simple debug key handler: match the Ursina app toggle keys.
  // `1` toggles the face HUD visibility (telemetry).
  let faceHudVisible = true
  const debugKeyHandler = (ev: KeyboardEvent) => {
    try {
      if (ev.key === '1') {
        faceHudVisible = !faceHudVisible
        faceHud.style.display = faceHudVisible ? 'block' : 'none'
      }
    } catch (e) {
      // ignore
    }
  }
  window.addEventListener('keydown', debugKeyHandler)


  // ##########################################################
  // --- Mouse hover + click face interaction (Ursina-like) ---
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredFace: string | null = null
  let hoveredTuple: [number, number, number] | null = null
  // reference to avoid unused-local TypeScript error when only set elsewhere
  void hoveredTuple
  let highlightedMeshes: THREE.Object3D[] = []
  let lastHoveredNormalWorld: THREE.Vector3 | null = null
  // reference to avoid unused-local TypeScript error when only set elsewhere
  void lastHoveredNormalWorld

  function clearHighlights() {
    for (const m of highlightedMeshes) {
      const mesh = m as THREE.Mesh
      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material as THREE.Material[]) {
          if ((mat as any).emissive) (mat as any).emissive.setHex(0x000000)
        }
      } else if ((mesh.material as any).emissive) {
        ;(mesh.material as any).emissive.setHex(0x000000)
      }
    }
    highlightedMeshes = []
  }

  function highlightAffectedByTuple(tuple: [number, number, number]) {
    clearHighlights()
    try {
      const mv = moveEngine.parse(tuple)
      const axisIndex = { x: 0, y: 1, z: 2 }[mv.axis]
      const keys = Array.from(model.cubes.keys()).map((k) => k.split(',').map((s) => parseInt(s, 10)) as [number, number, number])
      const affected = keys.filter((k) => k[axisIndex] === mv.layer)
      for (const coord of affected) {
        const mesh = findMeshByGridPos(cube, { x: coord[0], y: coord[1], z: coord[2] }) as any
        if (mesh) {
          // tint emissive slightly to highlight
          if (Array.isArray(mesh.material)) {
            for (const mat of mesh.material as any[]) {
              if (mat && typeof mat.emissive !== 'undefined') mat.emissive.setHex(0x444444)
            }
          } else if (mesh.material && typeof (mesh.material as any).emissive !== 'undefined') {
            ;(mesh.material as any).emissive.setHex(0x444444)
          }
          highlightedMeshes.push(mesh)
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  function updateHoverFromEvent(ev: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(cube.children, true)
    if (intersects.length > 0) {
      const it = intersects[0]
      const mesh = it.object as THREE.Mesh
      if (it.face && mesh) {
        // face.normal is in geometry local; convert to world then to cube-local
        const normalWorld = it.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize()
        lastHoveredNormalWorld = normalWorld.clone()
        const cubeQuat = new THREE.Quaternion()
        cube.getWorldQuaternion(cubeQuat)
        const inv = cubeQuat.clone().invert()
        const localNormal = normalWorld.clone().applyQuaternion(inv)
        const tuple: [number, number, number] = [Math.round(localNormal.x), Math.round(localNormal.y), Math.round(localNormal.z)]
        const face = axisTupleToFace(tuple)

        // Only consider exterior faces: the cubie's grid position must be
        // on the outermost layer along the normal's axis.
        const gp: any = (mesh as any).gridPosition
        const gridSize = CUBE_CONFIG.GRID_SIZE
        let isOuter = false
        if (gp) {
          if (tuple[0] === 1 && gp.x === gridSize - 1) isOuter = true
          if (tuple[0] === -1 && gp.x === 0) isOuter = true
          if (tuple[1] === 1 && gp.y === gridSize - 1) isOuter = true
          if (tuple[1] === -1 && gp.y === 0) isOuter = true
          if (tuple[2] === 1 && gp.z === gridSize - 1) isOuter = true
          if (tuple[2] === -1 && gp.z === 0) isOuter = true
        }

        if (!isOuter) {
          hoveredFace = null
          hoveredTuple = null
          return
        }

          hoveredFace = face
          hoveredTuple = tuple
          highlightAffectedByTuple(tuple)
        return
      }
    }
    hoveredFace = null
    hoveredTuple = null
      clearHighlights()
  }

  renderer.domElement.addEventListener('pointermove', (ev) => {
    try { updateHoverFromEvent(ev) } catch (_) {}
  })

  function handleFaceClick(baseDir: 1 | -1 = 1) {
    // shared handler for left-click or right-button click actions
    try {
      if (hoveredFace) {
        // Base direction (1 for left, -1 for right) then adjust by
        // camera-facing comparison to ensure positive means clockwise.
          // Use the provided base direction but invert for Front/Left/Down
          // on left-click to preserve the previously expected mouse behavior.
          let dir: 1 | -1 = baseDir
          // Invert for Front/Left/Down so these faces rotate in the
          // opposite direction on both left and right clicks (preserve
          // expected behavior across input methods).
          if (hoveredFace === 'F' || hoveredFace === 'L' || hoveredFace === 'D') {
            dir = (dir as number) * -1 as 1 | -1
            console.debug('[Scene] special-case flip for F/L/D', { dir, face: hoveredFace })
          }
          // Use InputController.enqueueIntent so collider input uses the
          // same pathway as keyboard (InputController -> Controller)
          inputController.enqueueIntent({ face: hoveredFace as any, direction: dir })
        clearHighlights()
      }
    } catch (e) {
      console.warn('click enqueue failed', e)
    }
  }

  renderer.domElement.addEventListener('click', () => {
    // left button: now reversed — perform face click with baseDir = -1
    handleFaceClick(-1)
  })

  // Right-button should do the same as left. Use pointerdown to capture
  // right-button presses and prevent the browser context menu.
  renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
    try {
        if (ev.button === 2) {
        ev.preventDefault()
        // right button: reversed — perform face click with baseDir = +1
        handleFaceClick(1)
      }
    } catch (e) {
      // ignore
    }
  })

  // Also prevent the browser context menu on right-click over the canvas
  renderer.domElement.addEventListener('contextmenu', (ev) => ev.preventDefault())

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

      if (container.contains(faceHud)) {
        container.removeChild(faceHud)
      }

      try {
        window.removeEventListener('keydown', debugKeyHandler)
      } catch (e) {}

      // Optional: If you aren't reusing the scene elsewhere, 
      // you should traverse the scene here and dispose of cube geometries/materials.
    }
  }
}