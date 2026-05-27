import type CubeModel from '../model/cube_model'

type RendererCallback = (
  before: any,
  after: any,
  meta?: any,
  opts?: { move?: any; affected?: any; speed?: number; on_complete?: () => void; committed?: boolean; change?: any }
) => void

export class CubeController {
  engine: any
  model: CubeModel
  renderer_callback?: RendererCallback

  private _queue: Array<any>
  private _is_processing = false

  constructor(engine: any, model: CubeModel, renderer_callback?: RendererCallback) {
    this.engine = engine
    this.model = model
    this.renderer_callback = renderer_callback
    this._queue = []
  }

  apply_rotate(normal_or_move: any, direction = 1, speed = 1, tracker?: any) {
    this._queue.push([normal_or_move, direction, speed, tracker])
    if (!this._is_processing) this._process_queue()
  }

  process_actions(actions: Array<[any, number, any]>) {
    for (const [normal_or_move, direction, tracker] of actions) {
      this.apply_rotate(normal_or_move, direction, 1, tracker)
    }
  }

  private _process_queue() {
    if (!this._queue.length) {
      this._is_processing = false
      return
    }

    const [normal_or_move, direction, speed, tracker] = this._queue.shift()!
    this._is_processing = true

    let change: any
    try {
      // Support intents shaped like { face: 'R', direction: 1 }
      let payload = normal_or_move
      if (payload && typeof payload === 'object' && 'face' in payload) {
        const face = (payload as any).face
        const faceMap: Record<string, any> = {
          R: { x: 1 },
          L: { x: -1 },
          U: { y: 1 },
          D: { y: -1 },
          F: { z: -1 }, // Ursina convention: F = -Z
          B: { z: 1 },
        }
        payload = faceMap[face] || payload
      }

      change = this.engine.apply(payload, direction)
      console.debug('[CubeController] engine.apply returned', { payload, change })
    } catch (e) {
      console.warn('[CubeController] engine.apply error:', e)
      this._on_action_complete(tracker)
      return
    }

    const before: any = this.model.snapshot()

    const meta = change.meta || {}

    const doCommit = () => {
      try {
        this.model.applyMove(change)
      } catch (e) {
        console.warn('[CubeController] model.applyMove error (commit):', e)
      }
    }

    if (this.renderer_callback) {
      // Commit to model immediately so the model is authoritative during animation
      doCommit()
      const after = this.model.snapshot()

      const onComplete = () => {
        // Notify renderer that animation completed; model already committed
        try {
          if (this.renderer_callback) {
            this.renderer_callback(before, after, meta, { committed: true, change })
          }
        } catch (_) {}
        if (tracker) try { tracker.is_animating = false } catch (_) {}
        this._on_action_complete(tracker)
      }

      try {
        if (tracker) tracker.is_animating = true
        // pass `before` and `after` so renderer can render transition based on authoritative model
        this.renderer_callback(before, after, meta, { move: change.move, affected: change.affected, speed, on_complete: onComplete })
      } catch (e) {
        // Fallback: continue
        this._on_action_complete(tracker)
      }
    } else {
      doCommit()
      this._on_action_complete(tracker)
    }
  }

  private _on_action_complete(tracker?: any) {
    this._is_processing = false
    if (tracker) try { tracker.is_animating = false } catch (_) {}
    if (this._queue.length) this._process_queue()
  }
}

export default CubeController
