import { describe, it, expect } from 'vitest'
import MoveEngine from '../src/engine/move_engine'
import CubeModel from '../src/model/cube_model'

describe('MoveEngine/CubeModel parity', () => {
  it('round-trip R then R\' returns to solved', () => {
    const model = new CubeModel(3)
    const engine = new MoveEngine(model)

    const change1 = engine.apply('R')
    model.applyMove(change1)

    const change2 = engine.apply("R'")
    model.applyMove(change2)

    expect(model.isSolved()).toBe(true)
  })

  it('round-trip for all faces returns to solved', () => {
    const faces = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"]
    // We'll test each pair (face, inverse)
    const pairs: Array<[string, string]> = [['R', "R'"], ['L', "L'"], ['U', "U'"], ['D', "D'"], ['F', "F'"], ['B', "B'"]]

    for (const [a, b] of pairs) {
      const model = new CubeModel(3)
      const engine = new MoveEngine(model)
      const c1 = engine.apply(a)
      model.applyMove(c1)
      const c2 = engine.apply(b)
      model.applyMove(c2)
      expect(model.isSolved()).toBe(true)
    }
  })

  it('apply by normal tuple and inverse returns to solved', () => {
    const model = new CubeModel(3)
    const engine = new MoveEngine(model)
    // Right face normal [1,0,0] (should map to R)
    const change1 = engine.apply([1, 0, 0])
    model.applyMove(change1)
    const change2 = engine.apply([1, 0, 0], -1) // direction override
    model.applyMove(change2)
    expect(model.isSolved()).toBe(true)
  })
})
