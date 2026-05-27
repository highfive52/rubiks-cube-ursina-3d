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
}

export default CubeModel
