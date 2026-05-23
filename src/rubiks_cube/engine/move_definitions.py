from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class Move:
    notation: str
    axis: str  # 'x', 'y', 'z'
    layer: int  # -1, 0, 1
    direction: int  # 1 or -1


def normal_to_axis_layer_direction(normal, direction=1) -> Move:
    """Convert a normal vector (tuple or Vec3-like) into a Move.

    normal: object with .x/.y/.z or a 3-tuple
    """
    try:
        x, y, z = int(normal.x), int(normal.y), int(normal.z)
    except Exception:
        x, y, z = map(int, normal)

    if x != 0:
        return Move(
            notation=f"R" if x == 1 else "L", axis="x", layer=x, direction=direction
        )
    if y != 0:
        return Move(
            notation=f"U" if y == 1 else "D", axis="y", layer=y, direction=direction
        )
    if z != 0:
        return Move(
            notation=f"B" if z == 1 else "F", axis="z", layer=z, direction=direction
        )

    raise ValueError("zero normal is not a valid face selector")
