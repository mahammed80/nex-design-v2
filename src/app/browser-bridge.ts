import type { ChatTransport, UIMessage } from 'ai'

import type { EditorStore } from '@/app/editor/session/create'

export interface NexDesignTestHooks {
  writeCount?: () => number
  mockHandle?: FileSystemFileHandle
  savedOpen?: Window['open']
}

export interface NexDesignWindowAPI {
  getStore?: () => EditorStore
  setChatTransport?: (factory: () => ChatTransport<UIMessage>) => void
  openFile?: (path: string) => Promise<void>
  test?: NexDesignTestHooks
}

declare global {
  interface Window {
    nexDesign?: NexDesignWindowAPI
  }
}

let activeStore: EditorStore | null = null

function windowApi(): NexDesignWindowAPI {
  window.nexDesign ??= {}
  window.nexDesign.getStore ??= () => {
    if (!activeStore) throw new Error('NexDesign store not initialized')
    return activeStore
  }
  return window.nexDesign
}

export function setNexDesignStore(store: EditorStore) {
  activeStore = store
  windowApi()
}

export function exposeChatTransportOverride(
  setChatTransport: (factory: () => ChatTransport<UIMessage>) => void
) {
  windowApi().setChatTransport = setChatTransport
}

export function setNexDesignOpenFileHandler(openFile: (path: string) => Promise<void>) {
  windowApi().openFile = openFile
}
