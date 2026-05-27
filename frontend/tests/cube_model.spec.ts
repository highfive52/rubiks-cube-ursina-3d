import { describe, it, expect } from 'vitest'
import CubeModel from '../src/model/cube_model'

describe('CubeModel', () => {
  it('initially solved and has correct count', () => {
    const model = new CubeModel(3)
    expect(model.isSolved()).toBe(true)
    expect(model.cubes.size).toBe(27)
  })

  it('applyMove with new_cubes updates state', () => {
    const model = new CubeModel(3)
    const snapshot = model.snapshot()
    // move the corner 0,0,0 to 0,0,1
    const new_cubes: Record<string, any> = {}
    for (const [k, v] of snapshot) {
      new_cubes[k] = { id: v.id, gridPos: v.gridPos }
    }
    // swap one entry: move the cubie at 0,0,1 into 0,0,0 and vice-versa
    const originalAt001 = new_cubes['0,0,1']
    new_cubes['0,0,1'] = { id: '0,0,0', gridPos: [0, 0, 1] }
    new_cubes['0,0,0'] = originalAt001

    model.applyMove({ new_cubes })
    expect(model.cubes.size).toBe(27)
    // ensure the id '0,0,0' now exists at 0,0,1
    let found = false
    for (const [k, v] of model.cubes) {
      if (v.id === '0,0,0') {
        expect(v.gridPos.x).toBe(0)
        expect(v.gridPos.y).toBe(0)
        expect(v.gridPos.z).toBe(1)
        found = true
      }
    }
    expect(found).toBe(true)
  })
})
