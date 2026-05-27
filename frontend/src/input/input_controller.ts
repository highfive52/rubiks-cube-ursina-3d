import type { MoveIntent } from '../engine/move_intent'
import { axisTupleToFace } from './camera_face_resolver'

type IntentHandler = (intent: MoveIntent) => void

export class InputController {
  private handler?: IntentHandler
  private enabled = false
  private screenAxesResolver?: () => { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string }

  constructor() {}

  start(handler: IntentHandler) {
    if (this.enabled) return
    this.handler = handler
    window.addEventListener('keydown', this.onKeyDown)
    this.enabled = true
  }

  // Allow programmatic enqueueing of intents (e.g., from mouse/collider)
  enqueueIntent(intent: MoveIntent) {
    if (this.handler) {
      this.handler(intent)
    } else {
      // If no handler is registered yet, silently ignore — caller should
      // ensure `start()` has been called during app init.
      console.debug('[InputController] enqueueIntent dropped (no handler)', intent)
    }
  }

  setScreenAxesResolver(resolver: () => { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: string }) {
    this.screenAxesResolver = resolver
  }

  stop() {
    if (!this.enabled) return
    window.removeEventListener('keydown', this.onKeyDown)
    this.enabled = false
    this.handler = undefined
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.handler) return

    // Basic mapping: W/A/S/D map to camera-relative faces later.
    // For Phase 8 start, map numeric face keys to intents for quick testing.
    const key = e.key.toUpperCase()

    let intent: MoveIntent | null = null

    console.debug('[InputController] keydown', { key, shift: e.shiftKey })

    switch (key) {
      case 'U':
        intent = { face: 'U', direction: 1 }
        break
      case 'D':
        intent = { face: 'D', direction: 1 }
        break
      case 'L':
        intent = { face: 'L', direction: 1 }
        break
      case 'R':
        intent = { face: 'R', direction: 1 }
        break
      case 'F':
        intent = { face: 'F', direction: 1 }
        break
      case 'B':
        intent = { face: 'B', direction: 1 }
        break
      case 'W':
      case 'A':
      case 'S':
      case 'D':
      case 'E':
        // camera-relative mapping (prefer adjacency mapping derived from camera-facing face)
        if (!this.screenAxesResolver) break
        const axes = this.screenAxesResolver()
        console.debug('[InputController] resolved axes', axes)

        const dir = (e.shiftKey ? -1 : 1) as 1 | -1

        // Use screen axes mapped to faces to respect camera roll.
        const rightFace = axisTupleToFace(axes.screenRightAxis)
        const upFace = axisTupleToFace(axes.screenUpAxis)
        const leftFace = rightFace ? ({ R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F' } as any)[rightFace] : null
        const downFace = upFace ? ({ R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F' } as any)[upFace] : null

        switch (key) {
          case 'D':
            if (rightFace) intent = { face: rightFace as any, direction: dir }
            break
          case 'A':
            if (leftFace) intent = { face: leftFace as any, direction: dir }
            break
          case 'W':
            if (upFace) intent = { face: upFace as any, direction: dir }
            break
          case 'S':
            if (downFace) intent = { face: downFace as any, direction: dir }
            break
          case 'E':
            if (axes.face) intent = { face: axes.face as any, direction: dir }
            break
        }

        // If we determined an intent from screen axes, adjust the direction
        // so that positive `direction` means clockwise from the viewer's
        // perspective. We compute a sign correction by comparing the camera-
        // facing face normal with the target face normal.
        if (intent && axes.face) {
          const faceToVec = (f: string | null) => {
            if (!f) return null
            switch (f) {
              case 'R':
                return [1, 0, 0] as [number, number, number]
              case 'L':
                return [-1, 0, 0] as [number, number, number]
              case 'U':
                return [0, 1, 0] as [number, number, number]
              case 'D':
                return [0, -1, 0] as [number, number, number]
                  case 'F':
                    return [0, 0, -1] as [number, number, number]
                  case 'B':
                    return [0, 0, 1] as [number, number, number]
            }
            return null
          }

          const camFaceVec = faceToVec(axes.face)
          const targetFaceVec = faceToVec(intent.face as string)
          if (camFaceVec && targetFaceVec) {
            const dot = camFaceVec[0] * targetFaceVec[0] + camFaceVec[1] * targetFaceVec[1] + camFaceVec[2] * targetFaceVec[2]
            // If the axis points roughly the same direction as the camera-facing
            // face normal, flip the sign so that positive direction is clockwise
            // from the camera view.
            const signCorrection = dot > 0 ? -1 : 1
            intent.direction = (intent.direction as 1 | -1) * signCorrection as 1 | -1
            console.debug('[InputController] adjusted intent direction', { intent, dot })
          }
        }
        break
      default:
        break
    }

    if (intent) this.handler(intent)
  }
}

export default InputController
