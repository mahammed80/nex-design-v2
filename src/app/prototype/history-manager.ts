import { ref } from 'vue'

import type { Transition } from '@nex-design/core/scene-graph'

/** A screen in the history, plus the transition that left it (replayed in reverse on Back). */
export interface HistoryEntry {
  frameId: string
  transition?: Transition
}

export class HistoryManager {
  private historyStack = ref<HistoryEntry[]>([])
  private forwardStack = ref<HistoryEntry[]>([])

  push(frameId: string, transition?: Transition) {
    const top = this.historyStack.value.at(-1)
    if (top?.frameId === frameId) {
      top.transition = transition
      return
    }
    this.historyStack.value.push({ frameId, transition })
    this.forwardStack.value = [] // Clear forward stack on new navigation
  }

  /** Step back from `currentFrameId`; the popped entry carries the transition to reverse. */
  pop(currentFrameId: string): HistoryEntry | null {
    const prev = this.historyStack.value.pop() ?? null
    if (prev === null) return null
    this.forwardStack.value.push({ frameId: currentFrameId, transition: prev.transition })
    return prev
  }

  canGoBack(): boolean {
    return this.historyStack.value.length > 0
  }

  canGoForward(): boolean {
    return this.forwardStack.value.length > 0
  }

  goForward(currentFrameId: string): HistoryEntry | null {
    const next = this.forwardStack.value.pop() ?? null
    if (next === null) return null
    this.historyStack.value.push({ frameId: currentFrameId, transition: next.transition })
    return next
  }

  clear() {
    this.historyStack.value = []
    this.forwardStack.value = []
  }
}
