from typing import Any, Iterable, Tuple
from .move_definitions import Move, normal_to_axis_layer_direction


class InvalidMoveError(ValueError):
    pass


class MoveEngine:
    """Parses move names or normals and applies them to a CubeModel.

    The engine is renderer-agnostic and mutates the provided `model` atomically.
    """

    _NOTATION_MAP = {
        "R": ("x", -1, 1),
        "R'": ("x", -1, -1),
        "L": ("x", 1, 1),
        "L'": ("x", 1, -1),
        "U": ("y", -1, 1),
        "U'": ("y", -1, -1),
        "D": ("y", 1, 1),
        "D'": ("y", 1, -1),
        "F": ("z", -1, 1),
        "F'": ("z", -1, -1),
        "B": ("z", 1, 1),
        "B'": ("z", 1, -1),
    }

    def __init__(self, model: Any):
        self.model = model

    def parse(self, move_name: Any) -> Move:
        # If already a Move, return it
        if isinstance(move_name, Move):
            return move_name

        # Handle notation strings
        if isinstance(move_name, str) and move_name in self._NOTATION_MAP:
            axis, hint, direction = self._NOTATION_MAP[move_name]
            layer = self._layer_from_hint(axis, hint)
            return Move(notation=move_name, axis=axis, layer=layer, direction=direction)

        # Handle normal-like inputs (tuple/list or object with x,y,z)
        if isinstance(move_name, (tuple, list)) or hasattr(move_name, "x"):
            try:
                move = normal_to_axis_layer_direction(move_name, direction=1)
            except ValueError as e:
                raise InvalidMoveError(str(e))
            # map -1/1 layer to model space extremes
            layer = self._extreme_layer(move.axis, positive=(move.layer > 0))
            return Move(
                notation=move.notation,
                axis=move.axis,
                layer=layer,
                direction=move.direction,
            )

        raise InvalidMoveError(f"Cannot parse move: {move_name}")

    def apply(self, move_name: Any, direction: int = None) -> dict:
        move = self.parse(move_name)
        # If caller provided an explicit direction override, create a new Move
        if direction is not None and hasattr(move, "direction"):
            move = Move(
                notation=getattr(move, "notation", ""),
                axis=move.axis,
                layer=move.layer,
                direction=direction,
            )

        # Determine affected cubies
        keys = list(self.model.cubes.keys())
        if not keys:
            raise InvalidMoveError("Model has no cubies")

        axis_index = {"x": 0, "y": 1, "z": 2}[move.axis]
        axis_values = sorted({k[axis_index] for k in keys})
        coord_min = axis_values[0]
        coord_max = axis_values[-1]
        center = (coord_min + coord_max) / 2

        affected = [k for k in keys if k[axis_index] == move.layer]
        if not affected:
            raise InvalidMoveError("No cubies affected by move")

        def rotate_centered(x, y, z, axis, direction):
            if axis == "x":
                if direction == 1:
                    return (x, -z, y)
                else:
                    return (x, z, -y)
            if axis == "y":
                if direction == 1:
                    return (z, y, -x)
                else:
                    return (-z, y, x)
            if axis == "z":
                if direction == 1:
                    return (-y, x, z)
                else:
                    return (y, -x, z)
            raise InvalidMoveError(f"Unknown axis: {axis}")

        new_cubes = dict(self.model.cubes)
        updates = {}

        for coord in affected:
            x, y, z = coord
            # center coords
            cx = x - center
            cy = y - center
            cz = z - center

            rx, ry, rz = rotate_centered(cx, cy, cz, move.axis, move.direction)

            new_x = int(round(rx + center))
            new_y = int(round(ry + center))
            new_z = int(round(rz + center))

            new_coord = (new_x, new_y, new_z)

            data = dict(self.model.cubes[coord])
            data["pos"] = new_coord
            data["rot"] = (0, 0, 0)
            updates[new_coord] = data

        # remove old affected keys
        for coord in affected:
            if coord in new_cubes:
                del new_cubes[coord]

        new_cubes.update(updates)

        # commit atomically
        self.model.cubes = new_cubes

        return {"move": move, "affected": affected, "meta": {"duration_hint": 0.15}}

    # helpers
    def _extreme_layer(self, axis: str, positive: bool) -> int:
        keys = list(self.model.cubes.keys())
        if not keys:
            return 0
        idx = {"x": 0, "y": 1, "z": 2}[axis]
        values = sorted({k[idx] for k in keys})
        return values[-1] if positive else values[0]

    def _layer_from_hint(self, axis: str, hint: int) -> int:
        keys = list(self.model.cubes.keys())
        if not keys:
            return hint
        idx = {"x": 0, "y": 1, "z": 2}[axis]
        values = sorted({k[idx] for k in keys})
        if hint == -1:
            return values[0]
        if hint == 0:
            return values[len(values) // 2]
        return values[-1]
