import * as THREE from 'three'
import { FACE_LETTER_TO_TUPLE } from './face_mappings'

type Face = keyof typeof FACE_LETTER_TO_TUPLE

function toFaceLetter(v: THREE.Vector3): Face {
  const candidates = Object.entries(FACE_LETTER_TO_TUPLE).map(([k, t]) => ({ k, v: new THREE.Vector3(t[0], t[1], t[2]) }))
  let best = candidates[0].k as Face
  let bestDot = -Infinity
  const nv = v.clone().normalize()
  for (const c of candidates) {
    const d = nv.dot(c.v)
    if (d > bestDot) {
      bestDot = d
      best = c.k as Face
    }
  }
  return best
}

export function computeAdjacency(cameraFace: Face, upFace: Face) {
  const nTuple = FACE_LETTER_TO_TUPLE[cameraFace]
  const uTuple = FACE_LETTER_TO_TUPLE[upFace]
  const n = new THREE.Vector3(nTuple[0], nTuple[1], nTuple[2])
  const u = new THREE.Vector3(uTuple[0], uTuple[1], uTuple[2])

  // Right = up x normal (viewer-right assuming up points 'up' in view)
  const right = new THREE.Vector3().crossVectors(u, n).normalize()
  const left = right.clone().negate()
  const up = u.clone().normalize()
  const down = up.clone().negate()

  return {
    right: toFaceLetter(right),
    left: toFaceLetter(left),
    up: toFaceLetter(up),
    down: toFaceLetter(down),
  }
}

export default { computeAdjacency }
