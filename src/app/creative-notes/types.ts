export type CreativeNoteColor = 'violet' | 'amber' | 'cyan' | 'rose'

export interface CreativeNote {
  id: string
  content: string
  color: CreativeNoteColor
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type CreativeNotesByDocument = Record<string, CreativeNote[]>
