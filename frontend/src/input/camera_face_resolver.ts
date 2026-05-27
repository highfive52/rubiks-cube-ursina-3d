import * as THREE from 'three'
import type { Face } from '../engine/move_intent'

export type FaceContext = {
  face: Face
  rightAxis: THREE.Vector3
  upAxis: THREE.Vector3
}

// Determine the dominant axis of the camera forward vector and map to a face.
export function resolveFaceFromCamera(camera: THREE.Camera, object?: THREE.Object3D): Face {
  const dir = new THREE.Vector3()
  camera.getWorldDirection(dir)

  // Use the selectFaceFromForward port of the Ursina `select_face` helper
  // to pick the best-facing tuple normal, then map the tuple to our Face.
  const faceTuple = selectFaceFromForward(
    dir,
    [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ],
    object
  )

  const [nx, ny, nz] = faceTuple
  if (nx === 1 && ny === 0 && nz === 0) return 'R'
  if (nx === -1 && ny === 0 && nz === 0) return 'L'
  if (nx === 0 && ny === 1 && nz === 0) return 'U'
  if (nx === 0 && ny === -1 && nz === 0) return 'D'
  if (nx === 0 && ny === 0 && nz === 1) return 'B'
  return 'F'
}

export function computeFaceContext(camera: THREE.Camera, object?: THREE.Object3D): FaceContext {
  // If an object (cube group) is provided, compute the camera-facing face
  // relative to the object's local axes. Otherwise fall back to world axes.
  const face = resolveFaceFromCamera(camera, object)

  // Compute camera right/up in world space, then optionally transform
  // into object local space by applying inverse object rotation.
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)

  if (object) {
    const objQuat = new THREE.Quaternion()
    object.getWorldQuaternion(objQuat)
    const inv = objQuat.clone().invert()
    right.applyQuaternion(inv)
    up.applyQuaternion(inv)
  }

  return { face, rightAxis: right, upAxis: up }
}

// Map an axis tuple like [1,0,0] or [-1,0,0] to the corresponding Face
export function axisTupleToFace(t: [number, number, number] | null): Face | null {
  if (!t) return null
  const [x, y, z] = t
  if (x === 1 && y === 0 && z === 0) return 'R'
  if (x === -1 && y === 0 && z === 0) return 'L'
  if (x === 0 && y === 1 && z === 0) return 'U'
  if (x === 0 && y === -1 && z === 0) return 'D'
  if (x === 0 && y === 0 && z === 1) return 'B'
  if (x === 0 && y === 0 && z === -1) return 'F'
  return null
}

// Map a camera axis (right or up) to the nearest cube face normal as an int tuple
export function resolveScreenAxes(camera: THREE.Camera, object?: THREE.Object3D): { screenRightAxis: [number, number, number] | null; screenUpAxis: [number, number, number] | null; face: Face } {
  const face = resolveFaceFromCamera(camera, object)

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()

  if (object) {
    const objQuat = new THREE.Quaternion()
    object.getWorldQuaternion(objQuat)
    const inv = objQuat.clone().invert()
    right.applyQuaternion(inv)
    up.applyQuaternion(inv)
  }

  // Use the Python-port screenAxesFromVectors for deterministic mapping
  const faceMappings = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]

  const axes = screenAxesFromVectors(right, up, faceMappings)
  return { screenRightAxis: axes.screenRightAxis, screenUpAxis: axes.screenUpAxis, face }
}

// Port of Python select_face: choose face normal that best matches camera forward
export function selectFaceFromForward(
  cam_forward: THREE.Vector3,
  faceMappings: Array<THREE.Vector3> | Record<string, any>,
  object?: THREE.Object3D
) {
  let forward = cam_forward.clone()
  // If an object is provided, transform the camera forward into object local space
  if (object) {
    const objQuat = new THREE.Quaternion()
    object.getWorldQuaternion(objQuat)
    const inv = objQuat.clone().invert()
    forward.applyQuaternion(inv)
  }

  const fx = forward.x
  const fy = forward.y
  const fz = forward.z

  const normals: THREE.Vector3[] = Array.isArray(faceMappings)
    ? (faceMappings as THREE.Vector3[])
    : (Object.keys(faceMappings) as any).map((k: string) => {
        const parts = k.split(',').map((s) => parseInt(s, 10))
        return new THREE.Vector3(parts[0], parts[1], parts[2])
      })

  let best: THREE.Vector3 | null = null
  let bestSim = -Infinity

  for (const n of normals) {
    // The visible face is the one whose normal points toward the camera.
    // `cam_forward` is the direction the camera is looking, so we want
    // normals that align with the inverse of that vector.
    const sim = -fx * n.x + -fy * n.y + -fz * n.z
    if (sim > bestSim) {
      bestSim = sim
      best = n.clone()
    }
  }

  if (!best) throw new Error('No face mapping provided')
  return [Math.sign(best.x), Math.sign(best.y), Math.sign(best.z)] as [number, number, number]
}

// Port of Python screen_axes: map camera right/up to nearest face normals with sign
export function screenAxesFromVectors(
  camRight: THREE.Vector3,
  camUp: THREE.Vector3,
  faceMappings: Array<[number, number, number]> | Record<string, any>
) {
  // normalize inputs to components
  const rx = camRight.x
  const ry = camRight.y
  const rz = camRight.z
  const ux = camUp.x
  const uy = camUp.y
  const uz = camUp.z

  const normals: Array<[number, number, number]> = Array.isArray(faceMappings)
    ? (faceMappings as Array<[number, number, number]>)
    : (Object.keys(faceMappings) as any).map((k: string) => k.split(',').map((s) => parseInt(s, 10)) as [number, number, number])

  function best_axis(vec: [number, number, number]) {
    let best: [number, number, number] | null = null
    let bestDot = -Infinity
    const [vx, vy, vz] = vec
    for (const n of normals) {
      const [nx, ny, nz] = n
      const dotRaw = vx * nx + vy * ny + vz * nz
      const dot = Math.abs(dotRaw)
      if (dot > bestDot) {
        bestDot = dot
        best = [nx * (dotRaw > 0 ? 1 : -1), ny * (dotRaw > 0 ? 1 : -1), nz * (dotRaw > 0 ? 1 : -1)]
      }
    }
    return best
  }

  const screen_right = best_axis([rx, ry, rz])
  const screen_up = best_axis([ux, uy, uz])
  return { screenRightAxis: screen_right, screenUpAxis: screen_up }
}

export default { resolveFaceFromCamera, computeFaceContext }

// Compute adjacent faces (right/left/up/down) for a given camera-facing face
export function computeAdjacentFaces(face: Face): { right: Face; left: Face; up: Face; down: Face } {
  const faceToVec = (f: Face) => {
    switch (f) {
      case 'R':
        return new THREE.Vector3(1, 0, 0)
      case 'L':
        return new THREE.Vector3(-1, 0, 0)
      case 'U':
        return new THREE.Vector3(0, 1, 0)
      case 'D':
        return new THREE.Vector3(0, -1, 0)
      // Ursina mapping: 'F' is -Z, 'B' is +Z
      case 'F':
        return new THREE.Vector3(0, 0, -1)
      case 'B':
        return new THREE.Vector3(0, 0, 1)
    }
  }

  const toFace = (v: THREE.Vector3) => {
    const abs = v.clone().normalize()
    const candidates: { f: Face; v: THREE.Vector3 }[] = [
      { f: 'R', v: new THREE.Vector3(1, 0, 0) },
      { f: 'L', v: new THREE.Vector3(-1, 0, 0) },
      { f: 'U', v: new THREE.Vector3(0, 1, 0) },
      { f: 'D', v: new THREE.Vector3(0, -1, 0) },
      { f: 'F', v: new THREE.Vector3(0, 0, -1) },
      { f: 'B', v: new THREE.Vector3(0, 0, 1) },
    ]
    let best: Face = 'F'
    let bestDot = -Infinity
    for (const c of candidates) {
      const d = abs.dot(c.v)
      if (d > bestDot) {
        bestDot = d
        best = c.f
      }
    }
    return best
  }

  const n = faceToVec(face)
  const worldUp = new THREE.Vector3(0, 1, 0)

  // right = worldUp x normal (viewer-right assuming camera-up aligns with worldUp)
  let rightVec = new THREE.Vector3().crossVectors(worldUp, n)
  if (rightVec.lengthSq() < 0.5) {
    // degenerate for top/bottom faces; fallback to Z-up
    rightVec = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), n)
  }
  rightVec.normalize()

  const right = toFace(rightVec)
  const left = ({ R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F' } as Record<Face, Face>)[right]

  // up can be computed as normal x right
  const upVec = new THREE.Vector3().crossVectors(n, rightVec).normalize()
  const up = toFace(upVec)
  const down = ({ R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F' } as Record<Face, Face>)[up]

  return { right, left, up, down }
}
