import type CubeModel from '../model/cube_model'
import { normalToMove } from './move_definitions'
import type { Move } from './move_definitions'

export class InvalidMoveError extends Error {}

export class MoveEngine {
  private model: CubeModel

  private static NOTATION_MAP: Record<string, [string, number, number]> = {
    R: ['x', -1, 1],
    "R'": ['x', -1, -1],
    L: ['x', 1, 1],
    "L'": ['x', 1, -1],
    U: ['y', -1, 1],
    "U'": ['y', -1, -1],
    D: ['y', 1, 1],
    "D'": ['y', 1, -1],
    F: ['z', -1, 1],
    "F'": ['z', -1, -1],
    B: ['z', 1, 1],
    "B'": ['z', 1, -1],
  }

  constructor(model: CubeModel) {
    this.model = model
  }

  parse(moveName: any): Move {
    // If already a Move-like object, return it
    if (moveName && typeof moveName === 'object' && 'axis' in moveName) return moveName as Move

    if (typeof moveName === 'string' && MoveEngine.NOTATION_MAP[moveName]) {
      const [axis, hint, direction] = MoveEngine.NOTATION_MAP[moveName]
      const layer = this._layerFromHint(axis as 'x' | 'y' | 'z', hint)
      return { notation: moveName, axis: axis as 'x' | 'y' | 'z', layer, direction: direction as 1 | -1 }
    }

    // Handle normal-like inputs
    if (Array.isArray(moveName) || (moveName && ('x' in moveName || 'y' in moveName || 'z' in moveName))) {
      try {
        const base = normalToMove(moveName as any, 1)
        const layer = this._extremeLayer(base.axis, base.layer > 0)

        // { notation: 'F',   - the face to be turned
        //    axis: 'z',      
        //    layer: -1, 
        //    direction: 1 
        // }

        // Face→axis mapping in this code:
        //   R/L → x
        //   U/D → y
        //   F/B → z

        return { notation: base.notation, axis: base.axis, layer, direction: base.direction }
      } catch (e: any) {
        throw new InvalidMoveError(String(e))
      }
    }

    throw new InvalidMoveError(`Cannot parse move: ${moveName}`)
  }

  apply(moveName: any, direction?: number) {
    const move = this.parse(moveName)
    const finalMove = direction !== undefined ? { ...move, direction: direction as 1 | -1 } : move

    const keys = Array.from(this.model.cubes.keys()).map((k) => k.split(',').map((s) => parseInt(s, 10)) as [number, number, number])
    if (!keys.length) throw new InvalidMoveError('Model has no cubies')

    const axisIndex = { x: 0, y: 1, z: 2 }[finalMove.axis]
    const axisValues = Array.from(new Set(keys.map((k) => k[axisIndex]))).sort()
    const coordMin = axisValues[0]
    const coordMax = axisValues[axisValues.length - 1]
    const center = (coordMin + coordMax) / 2

    const affected = keys.filter((k) => k[axisIndex] === finalMove.layer)

    if (!affected.length) throw new InvalidMoveError('No cubies affected by move')

    function rotate_centered(x: number, y: number, z: number, axis: string, direction: number) {
      if (axis === 'x') {
        if (direction === 1) return [x, -z, y]
        else return [x, z, -y]
      }
      if (axis === 'y') {
        if (direction === 1) return [z, y, -x]
        else return [-z, y, x]
      }
      if (axis === 'z') {
        if (direction === 1) return [-y, x, z]
        else return [y, -x, z]
      }
      throw new InvalidMoveError(`Unknown axis: ${axis}`)
    }

    const new_cubes: Record<string, any> = {}
    const oldMap: Record<string, any> = Object.fromEntries(Array.from(this.model.cubes.entries()))

    for (const coord of affected) {
      const [x, y, z] = coord
      const cx = x - center
      const cy = y - center
      const cz = z - center
      const [rx, ry, rz] = rotate_centered(cx, cy, cz, finalMove.axis, finalMove.direction)
      const new_x = Math.round(rx + center)
      const new_y = Math.round(ry + center)
      const new_z = Math.round(rz + center)
      const new_coord = [new_x, new_y, new_z]
      const key = `${new_coord[0]},${new_coord[1]},${new_coord[2]}`
      const oldKey = `${x},${y},${z}`
      const data = { ...(oldMap[oldKey] || {} as any) }
      data.pos = new_coord
      data.rot = [0, 0, 0]
      new_cubes[key] = data
    }

    // Build final new_cubes by copying old and replacing affected
    const finalNewCubes: Record<string, any> = {}
    for (const [k, v] of Object.entries(oldMap)) {
      finalNewCubes[k] = v
    }
    for (const k of affected.map((c) => `${c[0]},${c[1]},${c[2]}`)) {
      delete finalNewCubes[k]
    }
    for (const k of Object.keys(new_cubes)) finalNewCubes[k] = new_cubes[k]

    return {
      move: finalMove,
      affected: affected,
      meta: { duration_hint: 0.15 },
      new_cubes: finalNewCubes,
    }
  }

  _extremeLayer(axis: 'x' | 'y' | 'z', positive: boolean) {
    const keys = Array.from(this.model.cubes.keys()).map((k) => k.split(',').map((s) => parseInt(s, 10)) as [number, number, number])
    if (!keys.length) return 0
    const idx = { x: 0, y: 1, z: 2 }[axis]
    const values = Array.from(new Set(keys.map((k) => k[idx]))).sort()
    return positive ? values[values.length - 1] : values[0]
  }

  _layerFromHint(axis: 'x' | 'y' | 'z', hint: number) {
    const keys = Array.from(this.model.cubes.keys()).map((k) => k.split(',').map((s) => parseInt(s, 10)) as [number, number, number])
    if (!keys.length) return hint
    const idx = { x: 0, y: 1, z: 2 }[axis]
    const values = Array.from(new Set(keys.map((k) => k[idx]))).sort()
    if (hint === -1) return values[0]
    if (hint === 0) return values[Math.floor(values.length / 2)]
    return values[values.length - 1]
  }
}

export default MoveEngine
