from typing import Any


class CubeController:
    """Controller mediates between input and the MoveEngine/model.

    It is responsible for validating/translating input-level requests
    and calling the engine to apply moves. The controller receives a
    renderer callback which it calls to animate moves after the model
    has been updated.
    """

    def __init__(self, engine: Any, model: Any, renderer_callback=None):
        self.engine = engine
        self.model = model
        self.renderer_callback = renderer_callback

        # Internal queue owned by controller to ensure sequencing independent
        # of the renderer implementation.
        self._queue = []
        self._is_processing = False

    def apply_rotate(self, normal_or_move, direction=1, speed=1, tracker=None):
        """Enqueue a rotate action to be processed sequentially by the controller.

        Actions are tuples: (normal_or_move, direction, speed, tracker)
        """
        self._queue.append((normal_or_move, direction, speed, tracker))
        # Start processing if idle
        if not self._is_processing:
            self._process_queue()

    def process_actions(self, actions):
        """Accept actions from `InputHandler.poll()` and enqueue them.

        Each action is a tuple `(normal_or_move, direction, tracker)`.
        """
        for normal_or_move, direction, tracker in actions:
            self.apply_rotate(
                normal_or_move, direction=direction, speed=1, tracker=tracker
            )

    def _process_queue(self):
        """Process the controller queue: compute engine change, commit model, animate.

        Workflow and contracts
        - Engine
        - Call: `change = self.engine.apply(normal_or_move, direction=direction)`
        - Expected return: a mapping (dict-like) describing the move. Typical keys:
            - `'move'`: canonical move representation (e.g., layer/axis spec or Move object)
            - `'affected'`: list/iterable of affected cubie identifiers
            - `'meta'`: optional metadata used by renderer (rotation axes, pivot, etc.)
            - `'new_cubes'`: new cube-state suitable for `model.apply_move`

        - Model
        - Call: `result = self.model.apply_move(change)`
        - Contract: `apply_move` commits `change['new_cubes']` to `self.model` and usually returns
            a dict with `{'before': <snapshot>, 'after': <snapshot>}`. If it returns something else,
            the controller falls back to calling `self.model.snapshot()` for the `after` state.
        - `snapshot()` returns whatever the model exposes as a serializable state (used by renderer).

        - Renderer
        - Preferred callback signature:
            `renderer_callback(before, after, meta, *, move=None, affected=None, speed=1, on_complete=None)`
            - `before` / `after`: snapshots from `model.snapshot()` or `apply_move` result
            - `meta`: `change.get('meta', {})`
            - `move` / `affected`: optional convenience fields from `change`
            - `speed`: playback speed
            - `on_complete`: callback to call when animation finishes (controller uses this to continue processing)

        - Legacy fallback (supported for migration):
            `renderer_callback(normal_or_move, direction, speed=<>, tracker=<>)`
            - If the preferred call raises `TypeError`, the controller will call legacy signature and then
            treat the action as completed (clears animation state) if the legacy renderer doesn't invoke `on_complete`.

        - Side effects & lifecycle
            - Controller sets `tracker.is_animating = True` before animation and clears it (`False`) in the `on_complete`.
            - `_on_action_complete(tracker)` is called to mark the controller idle and continue the queue.
        - Error handling
            - Exceptions from `engine.apply` or `model.apply_move` are logged; the controller marks the action complete
            and proceeds to the next queued action.

        """

        if not self._queue:
            self._is_processing = False
            return

        normal_or_move, direction, speed, tracker = self._queue.pop(0)
        self._is_processing = True

        # Compute change (engine is pure)
        try:
            change = self.engine.apply(normal_or_move, direction=direction)
        except Exception as e:
            # Log the engine error and, for common ignored-action cases,
            # emit a concise runtime notice so regressions are easier to find.
            print("[CubeController] engine.apply error:", e)
            try:
                msg = str(e)
                if "No cubies affected by move" in msg:
                    mcount = len(getattr(self.model, "cubes", {}))
                    print(
                        "[CubeController] ignored action:",
                        f"action={normal_or_move}",
                        f"direction={direction}",
                        f"model_cubies={mcount}",
                    )
            except Exception:
                pass
            self._on_action_complete(tracker)
            return

        # Snapshot before, commit to model, then animate
        try:
            before = self.model.snapshot()
            result = self.model.apply_move(change)
            after = (
                result.get("after")
                if isinstance(result, dict)
                else self.model.snapshot()
            )
        except Exception as e:
            print("[CubeController] model.apply_move error:", e)
            self._on_action_complete(tracker)
            return

        # Start renderer animation. Expect renderer_callback to conform to
        # animate_from_model_change(before, after, meta, speed, on_complete)
        if self.renderer_callback:
            meta = change.get("meta", {})

            def _on_complete():
                # Allow tracker to observe animation lifecycle
                if tracker:
                    try:
                        tracker.is_animating = False
                    except Exception:
                        pass
                self._on_action_complete(tracker)

            try:
                # Mark tracker as animating for UI observers
                if tracker:
                    tracker.is_animating = True

                # Preferred renderer API
                self.renderer_callback(
                    before,
                    after,
                    meta,
                    move=change.get("move"),
                    affected=change.get("affected"),
                    speed=speed,
                    on_complete=_on_complete,
                )
            except TypeError:
                # Fallback to legacy renderer callback signature for migration
                try:
                    if tracker:
                        tracker.is_animating = True
                    self.renderer_callback(
                        normal_or_move, direction, speed=speed, tracker=tracker
                    )
                finally:
                    # If legacy renderer won't call completion, we clear and continue
                    _on_complete()
        else:
            # No renderer — immediately complete
            self._on_action_complete(tracker)

    def _on_action_complete(self, tracker=None):
        self._is_processing = False
        # Continue processing next action if present
        if self._queue:
            self._process_queue()
