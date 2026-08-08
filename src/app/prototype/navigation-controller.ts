import type { EditorStore } from '@/app/editor/active-store'

import type { HistoryManager } from './history-manager'
import type { TransitionEngine } from './transition-engine'
import type { PresentationState, TransitionType, TransitionDirection } from './types'

export class NavigationController {
  constructor(
    private editor: EditorStore,
    private history: HistoryManager,
    private transitionEngine: TransitionEngine,
    private state: PresentationState
  ) {}

  navigate(
    destinationId: string,
    transitionType: TransitionType = 'INSTANT',
    transitionDirection?: TransitionDirection,
    duration: number = 300
  ) {
    if (!destinationId || !this.editor.graph.getNode(destinationId)) return

    // Push current active screen to back-stack before moving forward
    this.history.push(this.state.activeFrameId)

    // Set active transition animations
    this.state.transitionName = this.transitionEngine.resolveTransitionName(
      transitionType,
      transitionDirection
    )
    this.state.transitionDuration = duration

    // Update active screen ID
    this.state.activeFrameId = destinationId
  }

  goBack() {
    if (!this.history.canGoBack()) return
    const prev = this.history.pop(this.state.activeFrameId)
    if (prev) {
      this.state.transitionName = 'instant'
      this.state.activeFrameId = prev
    }
  }

  goForward() {
    if (!this.history.canGoForward()) return
    const next = this.history.goForward(this.state.activeFrameId)
    if (next) {
      this.state.transitionName = 'instant'
      this.state.activeFrameId = next
    }
  }
}
