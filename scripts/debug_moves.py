from rubiks_cube.model.cube_model import CubeModel
from rubiks_cube.engine.move_engine import MoveEngine

cm = CubeModel()
engine = MoveEngine(cm)

candidates = [
    (0, 0, -1),  # front
    (0, 0, 1),  # back
    (1, 0, 0),  # right
    (-1, 0, 0),  # left
    (0, 1, 0),  # up
    (0, -1, 0),  # down
]

for n in candidates:
    try:
        change = engine.apply(n, direction=1)
        print(
            "normal",
            n,
            "-> move",
            change.get("move"),
            "affected",
            change.get("affected")[:5],
            "count",
            len(change.get("affected")),
        )
    except Exception as e:
        print("normal", n, "-> ERROR", e)

# Also test Move objects vs normal tuples
from rubiks_cube.engine.move_definitions import Move

print("\nTesting Move objects:")
for m in [
    Move("U", "y", -1, 1),
    Move("D", "y", 1, 1),
    Move("F", "z", -1, 1),
    Move("B", "z", 1, 1),
]:
    try:
        change = engine.apply(m, direction=None)
        print("Move", m, "-> affected", len(change.get("affected")))
    except Exception as e:
        print("Move", m, "-> ERROR", e)
