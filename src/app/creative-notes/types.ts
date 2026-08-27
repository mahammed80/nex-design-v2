export type CreativeNoteColor = 'yellow' | 'violet' | 'amber' | 'cyan' | 'rose' | 'emerald' | 'orange'

export interface CreativeNoteReply {
  id: string
  author: string
  content: string
  createdAt: number
}

export interface CreativeNote {
  id: string
  content: string
  color: CreativeNoteColor
  pinned: boolean
  image?: string
  x?: number
  y?: number
  resolved?: boolean
  replies?: CreativeNoteReply[]
  createdAt: number
  updatedAt: number
}

export type CreativeNotesByDocument = Record<string, CreativeNote[]>
