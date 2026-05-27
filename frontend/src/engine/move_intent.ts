export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'

export type MoveIntent = {
  face: Face
  direction: 1 | -1
}

export function invertIntent(intent: MoveIntent): MoveIntent {
  return { face: intent.face, direction: (intent.direction === 1 ? -1 : 1) }
}

// no default export for a type-only module
