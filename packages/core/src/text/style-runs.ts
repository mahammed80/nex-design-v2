import type { CharacterStyleOverride, StyleRun, TextDecoration } from '#core/scene-graph'

export function getStyleAt(_runs: StyleRun[], _index: number): CharacterStyleOverride {
  return {}
}

export function applyStyleToRange(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _patch: CharacterStyleOverride,
  _textLength: number
): StyleRun[] {
  return []
}

export function removeStyleFromRange(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _keys: (keyof CharacterStyleOverride)[],
  _textLength: number
): StyleRun[] {
  return []
}

export function selectionHasStyle(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _key: keyof CharacterStyleOverride,
  _value: unknown
): boolean {
  return false
}

export function adjustRunsForInsert(
  _runs: StyleRun[],
  _pos: number,
  _insertLength: number
): StyleRun[] {
  return []
}

export function adjustRunsForDelete(
  _runs: StyleRun[],
  _start: number,
  _deleteLength: number
): StyleRun[] {
  return []
}

export function toggleBoldInRange(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _nodeWeight: number,
  _textLength: number
): { runs: StyleRun[]; newWeight: number } {
  return { runs: [], newWeight: 400 }
}

export function toggleItalicInRange(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _nodeItalic: boolean,
  _textLength: number
): { runs: StyleRun[]; newItalic: boolean } {
  return { runs: [], newItalic: false }
}

export function toggleDecorationInRange(
  _runs: StyleRun[],
  _start: number,
  _end: number,
  _deco: TextDecoration,
  _nodeDeco: TextDecoration,
  _textLength: number
): { runs: StyleRun[]; newDeco: TextDecoration } {
  return { runs: [], newDeco: 'NONE' }
}
