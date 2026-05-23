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

    def apply_rotate(self, normal_or_move, direction=1, speed=1, tracker=None):
        """Apply a rotate action coming from input.

        Accepts either a normal-like object (Vec3) or a canonical Move.
        Calls the engine to apply the move synchronously (mutating the
        provided CubeModel), then asks the renderer to animate the same
        face to preserve UX.
        """
        try:
            print(
                "[CubeController] apply_rotate called:",
                normal_or_move,
                direction,
                "tracker=",
                bool(tracker),
            )
            result = self.engine.apply(normal_or_move, direction=direction)
        except Exception as e:
            print("[CubeController] engine.apply error:", e)
            return

        # Ask the renderer to animate the same face (preserve existing API)
        if self.renderer_callback:
            try:
                self.renderer_callback(
                    normal_or_move, direction, speed=speed, tracker=tracker
                )
            except TypeError:
                self.renderer_callback(normal_or_move, tracker=tracker)

    def process_actions(self, actions):
        """Process a list of actions produced by an InputHandler.

        Each action is a tuple `(normal_or_move, direction, tracker)`.
        """
        for normal_or_move, direction, tracker in actions:
            if tracker:
                tracker.is_animating = True
            self.apply_rotate(
                normal_or_move, direction=direction, speed=1, tracker=tracker
            )
