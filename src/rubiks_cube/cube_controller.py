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
