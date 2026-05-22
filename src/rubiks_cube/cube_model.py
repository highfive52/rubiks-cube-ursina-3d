class CubeModel:
    def __init__(self):
        self.cubes = self._init_solved_state()

    def _init_solved_state(self):
        cubes = {}
        for x in range(3):
            for y in range(3):
                for z in range(3):
                    cubes[(x, y, z)] = {"pos": (x, y, z), "rot": (0, 0, 0)}
        return cubes

    def apply_move(self, move):
        # Phase 2 will implement real cube logic
        pass

    def is_solved(self):
        return all(data["rot"] == (0, 0, 0) for data in self.cubes.values())
