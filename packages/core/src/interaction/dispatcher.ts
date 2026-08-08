import type { SceneGraph, SceneNode } from '#core/scene-graph'
import { getAncestorStack } from '#core/scene-graph/traversal'

import { createInteractionEvent } from './event'
import type {
  InteractionEvent,
  InteractionEventInit,
  InteractionEventPhase,
  InteractionEventType,
  InteractionHandler
} from './types'

export interface InteractionDispatcher {
  on(nodeId: string, type: InteractionEventType, handler: InteractionHandler): () => void
  off(nodeId: string, type: InteractionEventType, handler: InteractionHandler): void
  dispatchStack(
    stack: SceneNode[],
    type: InteractionEventType,
    init?: InteractionEventInit
  ): InteractionEvent
  dispatchAt(
    targetId: string,
    type: InteractionEventType,
    init?: InteractionEventInit,
    scopeId?: string
  ): InteractionEvent
  dispatchHoverChange(previous: SceneNode[], next: SceneNode[], init?: InteractionEventInit): void
  hasListeners(nodeId?: string, type?: InteractionEventType): boolean
  /** Drop all listeners registered for a deleted node. */
  onNodeDeleted(nodeId: string): void
  clear(): void
}

type ListenerMap = Map<InteractionEventType, Set<InteractionHandler>>

export function createInteractionDispatcher(getGraph: () => SceneGraph): InteractionDispatcher {
  const listeners = new Map<string, ListenerMap>()

  function handlersFor(
    nodeId: string,
    type: InteractionEventType
  ): Set<InteractionHandler> | undefined {
    return listeners.get(nodeId)?.get(type)
  }

  function on(nodeId: string, type: InteractionEventType, handler: InteractionHandler) {
    let byType = listeners.get(nodeId)
    if (!byType) {
      byType = new Map()
      listeners.set(nodeId, byType)
    }
    let set = byType.get(type)
    if (!set) {
      set = new Set()
      byType.set(type, set)
    }
    set.add(handler)
    return () => off(nodeId, type, handler)
  }

  function off(nodeId: string, type: InteractionEventType, handler: InteractionHandler) {
    const set = handlersFor(nodeId, type)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) {
      const byType = listeners.get(nodeId)
      byType?.delete(type)
      if (byType && byType.size === 0) listeners.delete(nodeId)
    }
  }

  function invokeAt(
    node: SceneNode,
    type: InteractionEventType,
    phase: InteractionEventPhase,
    event: InteractionEvent
  ) {
    const set = handlersFor(node.id, type)
    if (!set) return
    event.phase = phase
    event.currentTargetId = node.id
    for (const handler of Array.from(set)) {
      handler(event)
      if (event.immediateStopped) return
    }
  }

  function dispatchStack(
    stack: SceneNode[],
    type: InteractionEventType,
    init: InteractionEventInit = {}
  ): InteractionEvent {
    const targetId = stack.length > 0 ? stack[stack.length - 1].id : getGraph().rootId
    const event = createInteractionEvent(type, targetId, init)

    if (stack.length === 0) return event

    for (let i = 0; i < stack.length - 1; i++) {
      if (!getGraph().getNode(stack[i].id)) continue
      invokeAt(stack[i], type, 'capture', event)
      if (event.immediateStopped || event.propagationStopped) return event
    }

    const target = stack[stack.length - 1]
    if (getGraph().getNode(target.id)) invokeAt(target, type, 'target', event)
    if (event.immediateStopped || event.propagationStopped) return event

    for (let i = stack.length - 2; i >= 0; i--) {
      if (!getGraph().getNode(stack[i].id)) continue
      invokeAt(stack[i], type, 'bubble', event)
      if (event.immediateStopped || event.propagationStopped) return event
    }

    return event
  }

  function dispatchAt(
    targetId: string,
    type: InteractionEventType,
    init: InteractionEventInit = {},
    scopeId?: string
  ): InteractionEvent {
    const stack = getAncestorStack(getGraph(), targetId, scopeId)
    return dispatchStack(stack, type, init)
  }

  /**
   * Dispatch `pointerleave` to nodes that left the hover path (inner -> outer)
   * and `pointerenter` to nodes that entered it (outer -> inner). Both are
   * target-only, matching DOM enter/leave which do not bubble.
   */
  function dispatchHoverChange(
    previous: SceneNode[],
    next: SceneNode[],
    init: InteractionEventInit = {}
  ) {
    const nextIds = new Set(next.map((n) => n.id))
    for (let i = previous.length - 1; i >= 0; i--) {
      if (!nextIds.has(previous[i].id)) dispatchStack([previous[i]], 'pointerleave', init)
    }
    const previousIds = new Set(previous.map((n) => n.id))
    for (const node of next) {
      if (!previousIds.has(node.id)) dispatchStack([node], 'pointerenter', init)
    }
  }

  function hasListeners(nodeId?: string, type?: InteractionEventType): boolean {
    if (nodeId) {
      const byType = listeners.get(nodeId)
      if (!byType) return false
      return type ? (byType.get(type)?.size ?? 0) > 0 : byType.size > 0
    }
    return listeners.size > 0
  }

  function onNodeDeleted(nodeId: string) {
    listeners.delete(nodeId)
  }

  function clear() {
    listeners.clear()
  }

  return {
    on,
    off,
    dispatchStack,
    dispatchAt,
    dispatchHoverChange,
    hasListeners,
    onNodeDeleted,
    clear
  }
}
