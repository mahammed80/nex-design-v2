import { ref } from 'vue'

export class HistoryManager {
  private historyStack = ref<string[]>([])
  private forwardStack = ref<string[]>([])

  push(frameId: string) {
    if (
      this.historyStack.value.length > 0 &&
      this.historyStack.value[this.historyStack.value.length - 1] === frameId
    ) {
      return
    }
    this.historyStack.value.push(frameId)
    this.forwardStack.value = [] // Clear forward stack on new navigation
  }

  pop(currentFrameId: string): string | null {
    const prev = this.historyStack.value.pop() ?? null
    if (prev === null) return null
    this.forwardStack.value.push(currentFrameId)
    return prev
  }

  canGoBack(): boolean {
    return this.historyStack.value.length > 0
  }

  canGoForward(): boolean {
    return this.forwardStack.value.length > 0
  }

  goForward(currentFrameId: string): string | null {
    const next = this.forwardStack.value.pop() ?? null
    if (next === null) return null
    this.historyStack.value.push(currentFrameId)
    return next
  }

  clear() {
    this.historyStack.value = []
    this.forwardStack.value = []
  }
}
