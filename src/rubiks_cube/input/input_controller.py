from collections import deque
from typing import Callable, Deque, Tuple, Union, Any

from ..engine.move_definitions import Move, normal_to_axis_layer_direction
from .move_actions import MoveAction, normal_to_moveaction


class InputController:
    """Platform-agnostic input controller.

    Responsibilities:
    - enqueue_action(action_or_normal, direction=1, tracker=None)
    - poll() for legacy consumers
    - register_handler(fn) for push-style consumers
    """

    def __init__(self):
        # queue of triplets: (canonical Move, direction, tracker)
        self._queue: Deque[Tuple[Move, int, Any]] = deque()
        # handlers receive canonical `Move` objects (push-style)
        self._handlers: list[Callable[[Move], None]] = []

    def enqueue_action(
        self,
        action_or_normal: Union[MoveAction, Move, Tuple],
        direction: int = 1,
        tracker=None,
    ):
        """Accepts MoveAction, canonical Move, or (normal, direction) tuples/lists.

        `tracker` is accepted for compatibility but not used here.
        """
        # Normalize inputs:
        # - If provided a `Move` (assumed canonical), keep it.
        # - If provided a `MoveAction`, convert to a plain normal tuple
        #   (e.g. axis='x', layer=-1 -> (-1,0,0)) so the engine can map
        #   layer extremes when parsing.
        # - If provided a normal-like object, pass it through.

        if isinstance(action_or_normal, Move):
            normal_or_move = action_or_normal
        elif isinstance(action_or_normal, MoveAction):
            # convert MoveAction (axis, layer) into a normal tuple
            ax = getattr(action_or_normal, "axis", None)
            layer = int(getattr(action_or_normal, "layer", 0))
            if ax == "x":
                normal_or_move = (layer, 0, 0)
            elif ax == "y":
                normal_or_move = (0, layer, 0)
            elif ax == "z":
                normal_or_move = (0, 0, layer)
            else:
                # Fallback: attempt to interpret as normal-like
                try:
                    normal_or_move = tuple(map(int, action_or_normal))
                except Exception:
                    normal_or_move = (0, 0, 0)
        else:
            # assume normal-like (tuple/list or Vec3-like)
            normal_or_move = action_or_normal

        entry = (normal_or_move, int(direction), tracker)
        self._queue.append(entry)

        # dispatch to handlers immediately (push-style) with the normalized form
        for h in list(self._handlers):
            try:
                h(normal_or_move)
            except Exception:
                pass

    def poll(self) -> list[Tuple[Move, int, Any]]:
        """Return and clear queued actions (legacy pull-style).

        Returns a list of triplets: (normal_or_move, direction, tracker) to
        match the legacy `InputHandler.poll()` consumer expectations.
        """
        items = list(self._queue)
        self._queue.clear()
        return items

    def register_handler(self, fn: Callable[[MoveAction], None]):
        self._handlers.append(fn)

    # Optional: an Ursina adapter can be implemented in the app layer to map keys/mouse
