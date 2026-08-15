import { useLocalStorage } from '@vueuse/core'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import type {
  CreativeNote,
  CreativeNoteColor,
  CreativeNotesByDocument
} from '@/app/creative-notes/types'

const CREATIVE_NOTES_STORAGE_KEY = 'nex-design:creative-notes'

const notesByDocument = useLocalStorage<CreativeNotesByDocument>(CREATIVE_NOTES_STORAGE_KEY, {})

export function creativeNotesDocumentKey(projectId: string | null, documentName: string): string {
  if (projectId) return `project:${projectId}`
  const normalizedName = documentName.trim().toLocaleLowerCase() || 'untitled'
  return `document:${normalizedName}`
}

export function sortCreativeNotes(notes: CreativeNote[]): CreativeNote[] {
  return notes.toSorted((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
}

export function useCreativeNotes(documentKey: MaybeRefOrGetter<string>) {
  const notes = computed(() => notesByDocument.value[toValue(documentKey)] ?? [])

  function write(next: CreativeNote[]) {
    notesByDocument.value = {
      ...notesByDocument.value,
      [toValue(documentKey)]: next
    }
  }

  function addNote(content: string, color: CreativeNoteColor): CreativeNote | null {
    const trimmed = content.trim()
    if (!trimmed) return null

    const now = Date.now()
    const note: CreativeNote = {
      id: crypto.randomUUID(),
      content: trimmed,
      color,
      pinned: false,
      createdAt: now,
      updatedAt: now
    }
    write([note, ...notes.value])
    return note
  }

  function updateNote(id: string, content: string) {
    write(
      notes.value.map((note) =>
        note.id === id ? { ...note, content, updatedAt: Date.now() } : note
      )
    )
  }

  function togglePin(id: string) {
    write(
      notes.value.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note
      )
    )
  }

  function deleteNote(id: string) {
    write(notes.value.filter((note) => note.id !== id))
  }

  return { notes, addNote, updateNote, togglePin, deleteNote }
}
