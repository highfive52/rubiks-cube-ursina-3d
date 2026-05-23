from rubiks_cube.input.move_actions import (
    move_to_dict,
    move_from_dict,
    normal_to_moveaction,
    MoveAction,
)
from rubiks_cube.engine.move_definitions import Move


def test_move_dict_roundtrip():
    m = Move("R", "x", 1, 1)
    d = move_to_dict(m)
    m2 = move_from_dict(d)
    assert m2.notation == m.notation
    assert m2.axis == m.axis
    assert m2.layer == m.layer
    assert m2.direction == m.direction


def test_normal_to_moveaction():
    ma = normal_to_moveaction((1, 0, 0), direction=-1, meta={"foo": "bar"})
    assert isinstance(ma, MoveAction)
    assert ma.axis == "x"
    assert ma.layer == 1
    assert ma.direction == -1
    assert ma.meta == {"foo": "bar"}
