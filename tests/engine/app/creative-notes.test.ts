import { describe, expect, test } from 'bun:test'

import { creativeNotesDocumentKey, sortCreativeNotes } from '@/app/creative-notes/storage'
import type { CreativeNote } from '@/app/creative-notes/types'

function note(id: string, updatedAt: number, pinned = false): CreativeNote {
  return {
    id,
    content: id,
    color: 'violet',
    pinned,
    createdAt: updatedAt,
    updatedAt
  }
}

describe('creative notes', () => {
  test('uses a stable project key when a project ID is available', () => {
    expect(creativeNotesDocumentKey('project-42', 'Renamed document')).toBe('project:project-42')
  })

  test('normalizes document names for local files', () => {
    expect(creativeNotesDocumentKey(null, '  Mood Board  ')).toBe('document:mood board')
    expect(creativeNotesDocumentKey(null, '')).toBe('document:untitled')
  })

  test('sorts pinned ideas first and recent ideas within each group', () => {
    const sorted = sortCreativeNotes([
      note('older', 1),
      note('pinned-old', 2, true),
      note('newer', 4),
      note('pinned-new', 3, true)
    ])

    expect(sorted.map((item) => item.id)).toEqual(['pinned-new', 'pinned-old', 'newer', 'older'])
  })
})
