"""Input package for platform-agnostic input handling.

Expose `InputController`, `MoveAction` helpers, and camera mapping utilities.
"""

from .input_controller import InputController
from .move_actions import move_to_dict, move_from_dict, MoveAction
from .camera_mapping import select_face, screen_axes

__all__ = [
    "InputController",
    "MoveAction",
    "move_to_dict",
    "move_from_dict",
    "select_face",
    "screen_axes",
]
