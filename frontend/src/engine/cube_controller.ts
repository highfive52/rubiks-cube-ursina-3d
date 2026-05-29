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

    // normal_or_move = [0,0,0], 
    // direction = 1, 
    // speed = 1, 
    // tracker = undefined

    this._queue.push([normal_or_move, direction, speed, tracker])
    if (!this._is_processing) this._process_queue()
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
        // We expect callers to pass normals (e.g. [1,0,0] or {x:1,y:0,z:0}).
        // Use the queued `direction` argument (caller-provided) — payload
        // no longer overrides it.
        const payload: any = normal_or_move
        const dir = typeof direction === 'number' ? direction : 1

        change = this.engine.apply(payload, dir)
      try {
        console.log('[CubeController] engine.apply returned', { payload, change })
      } catch (e) {}
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
