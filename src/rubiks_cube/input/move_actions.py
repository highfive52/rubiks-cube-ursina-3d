from dataclasses import dataclass, asdict
from typing import Any, Dict

from ..engine.move_definitions import Move, normal_to_axis_layer_direction


@dataclass(frozen=True)
class MoveAction:
    """Portable MoveAction wrapper.

    Fields are intentionally serializable (primitives, lists).
    """

    notation: str
    axis: str
    layer: int
    direction: int
    meta: Dict[str, Any] | None = None

    @classmethod
    def from_move(cls, move: Move, meta: Dict[str, Any] | None = None):
        return cls(move.notation, move.axis, move.layer, move.direction, meta=meta)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if d.get("meta") is None:
            d.pop("meta")
        return d


def move_to_dict(move: Move) -> Dict[str, Any]:
    """Convert canonical `Move` to serializable dict."""
    return {
        "notation": move.notation,
        "axis": move.axis,
        "layer": move.layer,
        "direction": move.direction,
    }


def move_from_dict(d: Dict[str, Any]) -> Move:
    """Create `Move` from dict produced by `move_to_dict` or external frontends."""
    return Move(d["notation"], d["axis"], int(d["layer"]), int(d["direction"]))


def normal_to_moveaction(
    normal, direction=1, meta: Dict[str, Any] | None = None
) -> MoveAction:
    """Helper to convert a normal vector (tuple or Vec3-like) into MoveAction."""
    move = normal_to_axis_layer_direction(normal, direction)
    return MoveAction.from_move(move, meta=meta)
