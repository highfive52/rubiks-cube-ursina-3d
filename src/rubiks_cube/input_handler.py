from typing import List, Tuple, Any


class InputHandler:
    """Collects input actions and exposes a `poll()` method returning
    pending actions for the controller to process.

    Actions are tuples: (normal_or_move, direction, tracker)
    """

    def __init__(self):
        self._queue: List[Tuple[Any, int, Any]] = []

    def enqueue_action(self, normal_or_move, direction=1, tracker=None):
        # Debug: show enqueued actions for runtime tracing
        try:
            print(
                "[InputHandler] enqueue_action:",
                normal_or_move,
                direction,
                "tracker=",
                bool(tracker),
            )
        except Exception:
            pass
        self._queue.append((normal_or_move, direction, tracker))

    def poll(self):
        items = list(self._queue)
        self._queue.clear()
        return items
