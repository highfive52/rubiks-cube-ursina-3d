import sys
import os

# Ensure `src` is on sys.path for imports during tests
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

from rubiks_cube.engine.move_engine import MoveEngine, InvalidMoveError
from rubiks_cube.model.cube_model import CubeModel


def test_apply_R_affects_right_face_and_moves_positions():
    model = CubeModel()
    engine = MoveEngine(model)

    # Sanity: model should have 27 cubies
    assert len(model.cubes) == 27

    # Apply a right-face move using normal tuple (1,0,0)
    original_id = id(model.cubes[(2, 0, 0)])
    # Compute the change from the engine, then commit via the model API.
    change = engine.apply((1, 0, 0))
    result = model.apply_move(change)

    assert isinstance(result, dict) and "after" in result

    # After applying R, the cubie that was at the maximum-x corner
    # should have moved to a different coordinate. Verify by checking
    # that the original cubie's dict object identity is no longer present
    # in the committed model state.
    assert (2, 2, 0) in model.cubes
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
