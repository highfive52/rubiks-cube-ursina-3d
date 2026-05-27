import * as THREE from 'three'
import { DEBUG } from '../config'

// Verify that a model snapshot (Map<string, any>) matches meshes under `root`.
// Throws in DEBUG mode when mismatches are found; otherwise logs errors.
export function verifyModelMeshSyncFromSnapshot(snapshot: Map<string, any>, root: THREE.Object3D, strict = false) {
  const errors: string[] = []

  // Build mesh lookup by userData.id
  const meshById = new Map<string, THREE.Object3D>()
  root.traverse((o: any) => {
    if (o && o.userData && typeof o.userData.id !== 'undefined') {
      meshById.set(String(o.userData.id), o)
    }
  })

  for (const [id, data] of snapshot) {
    const expected = data && (data.gridPos || data.pos)
    const mesh = meshById.get(String(id))
    if (!mesh) {
      errors.push(`missing mesh for id=${id} expectedPos=${JSON.stringify(expected)}`)
      continue
    }
    const gp = (mesh as any).gridPosition
    if (!gp) {
      errors.push(`mesh for id=${id} has no gridPosition`) 
      continue
    }
    if (expected && (gp.x !== expected[0] && gp.x !== expected.x || gp.y !== expected[1] && gp.y !== expected.y || gp.z !== expected[2] && gp.z !== expected.z)) {
      // Normalize expected shape
      const ex = Array.isArray(expected) ? { x: expected[0], y: expected[1], z: expected[2] } : { x: expected.x, y: expected.y, z: expected.z }
      if (gp.x !== ex.x || gp.y !== ex.y || gp.z !== ex.z) {
        errors.push(`pos mismatch id=${id} model=${ex.x},${ex.y},${ex.z} mesh=${gp.x},${gp.y},${gp.z}`)
      }
    }
  }

  if (errors.length) {
    console.error('[verify] model/mesh mismatches', errors)
    if (DEBUG || strict) {
      throw new Error('Model/Mesh sync failed; see console for details')
    }
  }
}

// Convenience wrapper for CubeModel instances that expose `cubes: Map<string, any>`
export function verifyModelMeshSync(modelOrSnapshot: any, root: THREE.Object3D, strict = false) {
  if (modelOrSnapshot && typeof modelOrSnapshot === 'object' && modelOrSnapshot instanceof Map) {
    return verifyModelMeshSyncFromSnapshot(modelOrSnapshot as Map<string, any>, root, strict)
  }
  if (modelOrSnapshot && typeof modelOrSnapshot === 'object' && modelOrSnapshot.cubes instanceof Map) {
    return verifyModelMeshSyncFromSnapshot(modelOrSnapshot.cubes as Map<string, any>, root, strict)
  }
  // unknown shape — no-op
  return
}
