export type Vec3 = { x: number; y: number; z: number }

export type CubieData = {
  id: string
  gridPos: Vec3
}

export class CubeModel {
  cubes: Map<string, CubieData>

  constructor(gridSize = 3) {
    this.cubes = this.initSolvedState(gridSize)
  }

  private key(x: number, y: number, z: number) {
    return `${x},${y},${z}`
  }

  private initSolvedState(gridSize: number): Map<string, CubieData> {
    const cubes = new Map<string, CubieData>()

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const key = this.key(x, y, z)

          cubes.set(key, {
            id: key,
            gridPos: { x, y, z },
          })
        }
      }
    }

    return cubes
  }

  snapshot() {
    return new Map(this.cubes)
  }

  getByKey(x: number, y: number, z: number) {
    return this.cubes.get(this.key(x, y, z))
  }

  // Get by grid position (returns CubieData or undefined)
  getByGrid(x: number, y: number, z: number) {
    return this.getByKey(x, y, z)
  }

  // Set a cubie's grid position by id
  setGridPos(id: string, newGridPos: Vec3) {
    // find entry by id
    for (const [k, v] of this.cubes) {
      if (v.id === id) {
        this.cubes.delete(k)
        const newKey = this.key(newGridPos.x, newGridPos.y, newGridPos.z)
        this.cubes.set(newKey, { id, gridPos: newGridPos })
        return true
      }
    }
    return false
  }

  // Apply an atomic remap: map oldKey -> newKey (both as "x,y,z" strings)
  applyRemap(remap: Map<string, string>) {
    const newMap = new Map<string, CubieData>()

    for (const [oldKey, data] of this.cubes) {
      const targetKey = remap.get(oldKey) || oldKey
      // parse targetKey into numbers
      const [x, y, z] = targetKey.split(',').map((s) => parseInt(s, 10))
      newMap.set(targetKey, { id: data.id, gridPos: { x, y, z } })
    }

    this.cubes = newMap
  }

  // Apply a move-like object (compat with Python MoveEngine.apply result)
  // Accepts either an object with `new_cubes` (Record<string, any>) or a Map<string, CubieData>
  applyMove(move: any) {
    const before = this.snapshot()
    if (move && typeof move === 'object') {
      if (move instanceof Map) {
        this.cubes = new Map(move as Map<string, CubieData>)
      } else if (move.new_cubes) {
        const incoming = move.new_cubes
        // incoming may be an object mapping keys -> data
        if (incoming instanceof Map) {
          this.cubes = new Map(incoming as Map<string, CubieData>)
        } else {
          const nm = new Map<string, CubieData>()
          for (const k of Object.keys(incoming)) {
            const d = incoming[k]
            // try to extract id and grid pos
            const id = d.id ?? d.pos ?? k
            const pos = d.pos ?? d.gridPos ?? k.split(',').map((s: string) => parseInt(s, 10))
            const [x, y, z] = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z]
            nm.set(k, { id: String(id), gridPos: { x: Number(x), y: Number(y), z: Number(z) } })
          }
          this.cubes = nm
        }
      }
    }
    const after = this.snapshot()
    return { before, after }
  }

  isSolved() {
    for (const [key, data] of this.cubes) {
      if (key !== data.id) return false
    }
    return true
  }
}

export default CubeModel
