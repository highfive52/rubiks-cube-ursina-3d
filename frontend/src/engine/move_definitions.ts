export type Move = {
  notation: string
  axis: 'x' | 'y' | 'z'
  layer: number // -1, 0, 1 (we use 0..2 grid indices but keep semantics)
  direction: 1 | -1
}

export function normalToMove(normal: { x?: number; y?: number; z?: number } | [number, number, number], direction: 1 | -1 = 1): Move {
  let x: number, y: number, z: number
  if (Array.isArray(normal)) {
    ;[x, y, z] = normal.map((n) => Number(n)) as [number, number, number]
  } else {
    x = Number((normal as any).x || 0)
    y = Number((normal as any).y || 0)
    z = Number((normal as any).z || 0)
  }

  if (x !== 0) {
    return {
      notation: x === 1 ? 'R' : 'L',
      axis: 'x',
      layer: x,
      direction,
    }
  }
  if (y !== 0) {
    return {
      notation: y === 1 ? 'U' : 'D',
      axis: 'y',
      layer: y,
      direction,
    }
  }
  if (z !== 0) {
    return {
      notation: z === 1 ? 'B' : 'F',
      axis: 'z',
      layer: z,
      direction,
    }
  }

  throw new Error('zero normal is not a valid face selector')
}

export default { normalToMove }
