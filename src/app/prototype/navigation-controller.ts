import type { Transition } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

import type { HistoryManager } from './history-manager'
import { inverseTransition, type TransitionEngine } from './transition-engine'
import type { PresentationState } from './types'

const INSTANT: Transition = { type: 'INSTANT', duration: 0, easing: 'LINEAR' }

export class NavigationController {
  constructor(
    private editor: EditorStore,
    private history: HistoryManager,
    private transitionEngine: TransitionEngine,
    private state: PresentationState
  ) {}

  private show(frameId: string, transition: Transition) {
    this.state.previousFrameId = this.state.activeFrameId
    this.state.transition = transition
    this.state.transitionName = this.transitionEngine.resolveTransitionName(
      transition.type,
      transition.direction
    )
    this.state.transitionDuration = transition.duration
    this.state.transitionEasing = transition.easing
    this.state.activeFrameId = frameId
  }

  navigate(destinationId: string, transition: Transition = INSTANT) {
    if (!destinationId || !this.editor.graph.getNode(destinationId)) return
    if (destinationId === this.state.activeFrameId) return
    this.history.push(this.state.activeFrameId, transition)
    this.show(destinationId, transition)
  }

  /** Back replays the arriving transition in reverse (push-left returns with push-right). */
  goBack() {
    const prev = this.history.pop(this.state.activeFrameId)
    if (prev) this.show(prev.frameId, inverseTransition(prev.transition ?? INSTANT))
  }

  goForward() {
    const next = this.history.goForward(this.state.activeFrameId)
    if (next) this.show(next.frameId, next.transition ?? INSTANT)
  }
}
