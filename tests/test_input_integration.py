from rubiks_cube.input import InputController
from rubiks_cube.model.cube_model import CubeModel
from rubiks_cube.engine.move_engine import MoveEngine


def test_inputcontroller_enqueues_and_engine_applies_for_all_faces():
    """End-to-end: InputController -> MoveEngine for each cube face.

    Ensures that normals enqueued by input layer are parseable by the
    engine and affect the expected number of cubies (9 for a 3x3 face).
    """
    faces = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]

    model = CubeModel()
    engine = MoveEngine(model)
    ic = InputController()

    for face in faces:
        for direction in (1, -1):
            ic.enqueue_action(face, direction, tracker=None)
            items = ic.poll()
            assert len(items) == 1, f"expected one queued item for {face}"
            normal_or_move, dir_ret, tracker = items[0]
            assert dir_ret == direction
            change = engine.apply(normal_or_move, direction=dir_ret)
            affected = change.get("affected")
            assert (
                affected and len(affected) == 9
            ), f"face {face} affected={len(affected) if affected else 0}"
