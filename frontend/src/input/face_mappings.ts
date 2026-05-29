// Unified face map for consistent usage across frontend and tests.
// Each entry provides the face tuple, a human-friendly name, and a color.
export const FACE_MAP: Record<
  string,
  { tuple: [number, number, number]; side: string; color: number; color_name: string }
> = {
  R: { tuple: [1, 0, 0], side: 'Right', color: 0xff69b4, color_name: 'Pink' },
  L: { tuple: [-1, 0, 0], side: 'Left', color: 0xffa500, color_name: 'Orange' },
  U: { tuple: [0, 1, 0], side: 'Up', color: 0xffffff, color_name: 'White' },
  D: { tuple: [0, -1, 0], side: 'Down', color: 0xffff00, color_name: 'Yellow' },
  B: { tuple: [0, 0, 1], side: 'Back', color: 0x007fff, color_name: 'Azure' },
  F: { tuple: [0, 0, -1], side: 'Front', color: 0x00ff00, color_name: 'Green' },
}

function keyOf(t: [number, number, number]) {
  return `${t[0]},${t[1]},${t[2]}`
}

// Derived helpers kept for compatibility with existing imports.
export const FACE_LETTER_TO_TUPLE: Record<string, [number, number, number]> =
  Object.fromEntries(Object.entries(FACE_MAP).map(([k, v]) => [k, v.tuple])) as any

export const FACE_TUPLE_TO_LETTER: Record<string, string> = Object.fromEntries(
  // Object.fromEntries() expects an array of 2‑element arrays: [key, value]
  Object.entries(FACE_LETTER_TO_TUPLE).map(([k, v]) => [keyOf(v), k])
)

export const FACE_NORMALS: Array<[number, number, number]> = Object.values(FACE_LETTER_TO_TUPLE)

export const FACE_NORMALS_MAP: Record<string, { side: string; color: number; color_name: string }> =
  Object.fromEntries(
    Object.entries(FACE_MAP).map(([, v]) => [keyOf(v.tuple), { side: (v as any).side, color: v.color, color_name: (v as any).color_name }])
  )

export default { FACE_MAP, FACE_LETTER_TO_TUPLE, FACE_NORMALS, FACE_NORMALS_MAP, FACE_TUPLE_TO_LETTER }
