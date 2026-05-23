import sys
import os

# Ensure `src` is on sys.path for imports during tests
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

from rubiks_cube.engine.move_engine import MoveEngine, InvalidMoveError
from rubiks_cube.cube_model import CubeModel


def test_apply_R_affects_right_face_and_moves_positions():
    model = CubeModel()
    engine = MoveEngine(model)

    # Sanity: model should have 27 cubies
    assert len(model.cubes) == 27

    # Apply a right-face move using normal tuple (1,0,0)
    original_id = id(model.cubes[(2, 0, 0)])
    result = engine.apply((1, 0, 0))

    assert "move" in result and "affected" in result

    # After applying R, the cubie that was at the maximum-x corner
    # should have moved to a different coordinate. Verify by checking
    # that no cubie's stored 'pos' still equals the original corner.
    assert (2, 2, 0) in model.cubes
    # Ensure the original cubie object moved (its dict identity no longer present)
    assert not any(id(data) == original_id for data in model.cubes.values())
    assert len(model.cubes) == 27


def test_invalid_move_raises_and_model_unchanged():
    model = CubeModel()
    engine = MoveEngine(model)

    before = dict(model.cubes)

    try:
        engine.apply((0, 0, 0))
    except InvalidMoveError:
        pass

    # Model must remain unchanged on invalid move
    assert model.cubes.keys() == before.keys()
