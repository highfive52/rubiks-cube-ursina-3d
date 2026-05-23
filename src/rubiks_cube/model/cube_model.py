class CubeModel:
    def __init__(self):
        self.cubes = self._init_solved_state()

    def snapshot(self):
        # Return a shallow copy suitable for comparison/animation
        return dict(self.cubes)

    def _init_solved_state(self):
        cubes = {}
        for x in range(3):
            for y in range(3):
                for z in range(3):
                    # Assign a stable `id` to each cubie so we can detect
                    # whether pieces have returned to their original slots.
                    cubes[(x, y, z)] = {
                        "pos": (x, y, z),
                        "rot": (0, 0, 0),
                        "id": (x, y, z),
                    }
        return cubes

    def apply_move(self, move):
        # `move` is expected to be a change dict produced by MoveEngine.apply()
        # Commit the provided new_cubes atomically and return before/after snapshots
        before = self.snapshot()
        if isinstance(move, dict) and "new_cubes" in move:
            self.cubes = dict(move["new_cubes"])
        else:
            # Backwards compatibility: accept a Move object (no-op)
            # In that case, do nothing
            pass
        after = self.snapshot()
        return {"before": before, "after": after}

    def is_solved(self):
        # Consider the cube solved when every cubie's original `id`
        # matches the current board position key.
        return all(key == data.get("id") for key, data in self.cubes.items())
