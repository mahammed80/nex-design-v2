import type { FileUIPart } from 'ai'

export type ChatRunMode = 'build' | 'plan'
export type ChatRunStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export interface ChatSubmission {
  id: string
  text: string
  files: FileUIPart[]
  mode: ChatRunMode
}

function submissionId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createChatSubmission(options: {
  text: string
  files?: FileUIPart[]
  mode: ChatRunMode
}): ChatSubmission {
  return {
    id: submissionId(),
    text: options.text.trim(),
    files: options.files ?? [],
    mode: options.mode
  }
}
