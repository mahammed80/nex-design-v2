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

  test('supports canvas pin coordinates, thread replies, and resolved status', () => {
    const threadNote: CreativeNote = {
      id: 'comment-1',
      content: 'Please adjust this button radius',
      color: 'amber',
      pinned: true,
      x: 150,
      y: 300,
      resolved: false,
      replies: [
        {
          id: 'reply-1',
          author: 'Alice',
          content: 'Updated to 8px',
          createdAt: 1000
        }
      ],
      createdAt: 500,
      updatedAt: 1000
    }

    expect(threadNote.x).toBe(150)
    expect(threadNote.y).toBe(300)
    expect(threadNote.replies?.length).toBe(1)
    expect(threadNote.replies?.[0].author).toBe('Alice')

    threadNote.resolved = true
    expect(threadNote.resolved).toBe(true)
  })
})
