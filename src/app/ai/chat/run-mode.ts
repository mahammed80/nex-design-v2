import type { EditorStore } from '@/app/editor/active-store'

import type { ChatRunMode } from './types'

const modeByStore = new WeakMap<EditorStore, ChatRunMode>()

export function setAgentRunMode(store: EditorStore, mode: ChatRunMode): void {
  modeByStore.set(store, mode)
}

export function getAgentRunMode(store: EditorStore): ChatRunMode {
  return modeByStore.get(store) ?? 'build'
}
