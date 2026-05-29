import type { MoveIntent } from '../engine/move_intent'
import { FACE_LETTER_TO_TUPLE, FACE_TUPLE_TO_LETTER } from './face_mappings'

type IntentHandler = (normalOrMove: any, direction?: number) => void

export class InputController {
  private handler?: IntentHandler
  private enabled = false
  private primeMode = false
  private screenAxesResolver?: () => { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string; camForward?: [number, number, number] }
  private lastAxesCache?: { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string; camForward?: [number, number, number]; camForwardWorld?: [number, number, number]; faceNormalsWorld?: Record<string, [number, number, number]>; representativeFaceNormalWorld?: [number, number, number] }

  constructor() {}

  start(handler: IntentHandler) {
    if (this.enabled) return
    this.handler = handler
    window.addEventListener('keydown', this.onKeyDown)
    this.enabled = true
  }

  stop() {
    if (!this.enabled) return
    window.removeEventListener('keydown', this.onKeyDown)
    this.enabled = false
    this.handler = undefined
  }

  // Allow programmatic enqueueing of intents (e.g., from mouse/collider)
  enqueueIntent(intent: MoveIntent) {
    if (this.handler) {
      // Normalize intent -> normal tuple + direction
      let payload: any = intent
      if (intent && typeof intent === 'object' && 'face' in intent) {
        const face = (intent as any).face
        payload = FACE_LETTER_TO_TUPLE[face] || payload
      }
      const direction = intent && typeof intent === 'object' && typeof (intent as any).direction === 'number' ? (intent as any).direction : 1
      this.handler(payload, direction)
    } else {
      // If no handler is registered yet, silently ignore — caller should
      // ensure `start()` has been called during app init.
      // enqueueIntent dropped (no handler)
    }
  }

  setScreenAxesResolver(resolver: () => { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string; camForward?: [number, number, number] }) {
    this.screenAxesResolver = resolver
    try {
      const initial = resolver()
      if (initial && (initial as any).face) this.lastAxesCache = initial as any
    } catch (e) {
      // ignore
    }
  }

  // Helper: decide parity multiplier (1 or -1) for a given face (`face`) and
  // adjacent side (`side`). Both parameters are face letters like 'R','L','U'.
  // Return 1 for no change, or -1 to invert direction. Fill logic as needed.
  private correctDirForCameraParity(face: string | null, side: string | null, currentDir: 1 | -1): 1 | -1 {
    let correctedDir: 1 | -1 = currentDir
    try {
      if (face === 'B' && (side === 'R' || side === 'U')) correctedDir = (correctedDir as number) * -1 as 1 | -1
      else if (face === 'R' && (side === 'U' || side === 'B')) correctedDir = (correctedDir as number) * -1 as 1 | -1
      else if (face === 'F' && (side === 'U' || side === 'R')) correctedDir = (correctedDir as number) * -1 as 1 | -1
      else if (face === 'L' && (side === 'U' || side === 'B')) correctedDir = (correctedDir as number) * -1 as 1 | -1
      else if (face === 'U' && (side === 'R' || side === 'B')) correctedDir = (correctedDir as number) * -1 as 1 | -1
      else if (face === 'D' && (side === 'R' || side === 'B')) correctedDir = (correctedDir as number) * -1 as 1 | -1
    } catch (e) {
      // ignore
    }
    return correctedDir
  }
 
  private onKeyDown = (e: KeyboardEvent) => {
    
    //   {
    //   key: "w",           // e.key
    //   code: "KeyW",       // e.code
    //   shiftKey: false,    // e.shiftKey
    //   preventDefault: () => {}, // method (called for Space)
    //   // many other properties/methods exist on the real event
    // }

    if (!this.handler) return
    
    // Space toggles a persistent "prime mode" (like the Ursina app's
    // prime_mode). When enabled, direction is inverted unless Shift is
    // explicitly pressed. Prevent default to avoid page scroll.

    if (e.code === 'Space') {
      e.preventDefault()
      this.primeMode = !this.primeMode
      // primeMode toggled
      return
    }

    // Basic mapping: W/A/S/D map to camera-relative faces later.
    // For Phase 8 start, map numeric face keys to intents for quick testing.
    const key = e.key.toUpperCase()

    let intent: MoveIntent | null = null
    let axes: { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string } | undefined = undefined

    // keydown: { key, shift }

    // Simple, per-key mapping mirroring the Ursina `CameraTracker.input()`
    // structure. We compute the screen axes once and then dispatch by key.
    try {
      const resolver = this.screenAxesResolver

      // resolver =
      //   {
      //     screenRightAxis: [1, 0, 0],
      //     screenUpAxis: [0, 1, 0],
      //     face: "B",
      //     camForward: [0, 0, 1],
      //     camForwardWorld: [0, 0, 1],
      //     targetFaceWorld: [0, 0, 1],
      //     faceNormalsWorld: {
      //         R: [1, 0, 0],
      //         L: [-1, 0, 0],
      //         U: [0, 1, 0],
      //         D: [0, -1, 0],
      //         F: [0, 0, -1],
      //         B: [0, 0, 1]
      //     }
      // }
      
      if (resolver) {
        axes = resolver()
        if (axes && (axes as any).face) this.lastAxesCache = axes as any
      } else {
        axes = this.lastAxesCache
      }
    } catch (err) {
      console.warn('[InputController] screenAxesResolver failed', err)
      axes = this.lastAxesCache
    }
    if (!axes) axes = this.lastAxesCache

    const dir = (e.shiftKey || this.primeMode ? -1 : 1) as 1 | -1

    const tupleToLetter = (t: [number, number, number] | null) => {
      if (!t) return null
      return FACE_TUPLE_TO_LETTER[`${t[0]},${t[1]},${t[2]}`] || null
    }
    const letterToTuple = (letter: string | null) => {
      if (!letter) return null
      return FACE_LETTER_TO_TUPLE[letter] || null
    }

    let correctedDir: 1 | -1
    switch (key) {
      // intent = { face: 'R', direction: 1 }
      case 'D': {
        const right = tupleToLetter((axes as any)?.screenRightAxis || null)
        if (right) {
          correctedDir = this.correctDirForCameraParity((axes as any)?.face || null, right, dir)
          intent = { face: right as any, direction: correctedDir }
        }
        break
      }
      case 'A': {
        const sr = (axes as any)?.screenRightAxis || null
        if (!sr) return
        const neg: [number, number, number] = [-sr[0], -sr[1], -sr[2]]
        const left = tupleToLetter(neg)
        if (left) {
          correctedDir = this.correctDirForCameraParity((axes as any)?.face || null, left, dir)
          intent = { face: left as any, direction: correctedDir }
        }
        break
      }
      case 'W': {
        const up = tupleToLetter((axes as any)?.screenUpAxis || null)
        if (up) {
          correctedDir = this.correctDirForCameraParity((axes as any)?.face || null, up, dir)
          intent = { face: up as any, direction: correctedDir }
        }
        break
      }
      case 'S': {
        const su = (axes as any)?.screenUpAxis || null
        if (!su) return
        const down: [number, number, number] = [-su[0], -su[1], -su[2]]
        const df = tupleToLetter(down)
        if (df) {
          correctedDir = this.correctDirForCameraParity((axes as any)?.face || null, df, dir)
          intent = { face: df as any, direction: correctedDir }
        }
        break
      }
      case 'E': {
        const faceRaw = (axes as any)?.face || null
        let faceLetter: string | null = null
        if (Array.isArray(faceRaw) && faceRaw.length === 3) {
          faceLetter = tupleToLetter(faceRaw as [number, number, number])
        } else if (typeof faceRaw === 'string') {
          // If resolver returned a tuple string like "0,0,1", try lookup.
          if (faceRaw.indexOf(',') >= 0) {
            faceLetter = FACE_TUPLE_TO_LETTER[faceRaw] || null
          } else {
            faceLetter = faceRaw
          }
        }
        if (faceLetter) {
          // Invert direction for R/U/B so keyboard `E` matches mouse parity.
          correctedDir = dir
          if (faceLetter === 'R' || faceLetter === 'U' || faceLetter === 'B') correctedDir = (correctedDir as number) * -1 as 1 | -1
          intent = { face: faceLetter as any, direction: correctedDir }
        }
        break
      }
      default:
        break
    }

    if (intent) {
      let finalDir: 1 | -1 = intent.direction
      const payload = letterToTuple(intent.face as string)

        // For R: [1, 0, 0]
        // For L: [-1, 0, 0]
        // For U: [0, 1, 0]
        // For D: [0, -1, 0]
        // For F: [0, 0, -1]
        // For B: [0, 0, 1]

      if (this.handler) this.handler(payload, finalDir)
    }
  }
}

export default InputController
