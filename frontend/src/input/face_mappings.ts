// Mirror of Python FACE_MAPPINGS used by the Ursina app
// Provides tuple normals, letter mappings, and human-friendly names + colors

export const FACE_LETTER_TO_TUPLE: Record<string, [number, number, number]> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  B: [0, 0, 1],
  F: [0, 0, -1],
}

export const FACE_NORMALS: Array<[number, number, number]> = Object.values(FACE_LETTER_TO_TUPLE)

function keyOf(t: [number, number, number]) {
  return `${t[0]},${t[1]},${t[2]}`
}

export const FACE_NORMALS_MAP: Record<string, { name: string; color: number }> = {
  [keyOf([1, 0, 0])]: { name: 'Right (Pink)', color: 0xff69b4 },
  [keyOf([-1, 0, 0])]: { name: 'Left (Orange)', color: 0xffa500 },
  [keyOf([0, 1, 0])]: { name: 'Top (White)', color: 0xffffff },
  [keyOf([0, -1, 0])]: { name: 'Bottom (Yellow)', color: 0xffff00 },
  [keyOf([0, 0, 1])]: { name: 'Back (Azure)', color: 0x007fff },
  [keyOf([0, 0, -1])]: { name: 'Front (Green)', color: 0x00ff00 },
}

export const FACE_TUPLE_TO_LETTER: Record<string, string> = Object.fromEntries(
  Object.entries(FACE_LETTER_TO_TUPLE).map(([k, v]) => [keyOf(v), k])
)

export default { FACE_LETTER_TO_TUPLE, FACE_NORMALS, FACE_NORMALS_MAP, FACE_TUPLE_TO_LETTER }
