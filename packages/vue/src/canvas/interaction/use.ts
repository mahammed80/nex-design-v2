import { onScopeDispose } from 'vue'

import type { Editor } from '@nex-design/core/editor'
import {
  createInteractionDispatcher,
  type InteractionDispatcher,
  type InteractionEvent,
  type InteractionEventInit,
  type InteractionEventType,
  type InteractionHandler
} from '@nex-design/core/interaction'
import type { SceneNode } from '@nex-design/core/scene-graph'
import { getAncestorStack } from '@nex-design/core/scene-graph'

type PointerLike = MouseEvent | WheelEvent | KeyboardEvent

export interface CanvasInteraction {
  /**
   * Hit-test stack (outermost-first, page root first) at a canvas point.
   */
  stackAt: (cx: number, cy: number) => SceneNode[]
  /**
   * Dispatch an interaction event through the hit-test stack at a point.
   * Pass `{ updateHover: true }` (pointermove) to also emit
   * `pointerenter`/`pointerleave` for hover transitions.
   */
  dispatch: (
    type: InteractionEventType,
    e: PointerLike,
    cx: number,
    cy: number,
    sx: number,
    sy: number,
    opts?: { updateHover?: boolean; clickCount?: number }
  ) => InteractionEvent
  /** Dispatch an interaction event through an explicit node stack. */
  dispatchStack: (
    type: InteractionEventType,
    e: PointerLike,
    stack: SceneNode[],
    opts?: { clickCount?: number }
  ) => InteractionEvent
  /** Register a listener on a scene node. Returns an unbind function. */
  on: (nodeId: string, type: InteractionEventType, handler: InteractionHandler) => () => void
  clear: () => void
  hasListeners: () => boolean
  /** Drop the hover path, emitting `pointerleave` for hovered nodes. */
  resetHover: () => void
}

function buildInit(
  e: PointerLike,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  clickCount?: number
): InteractionEventInit {
  const isKey = e instanceof KeyboardEvent
  return {
    point: isKey ? null : { x: cx, y: cy },
    screenPoint: isKey ? null : { x: sx, y: sy },
    button: !isKey && 'button' in e ? e.button : 0,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
    clickCount:
      clickCount ?? (!isKey && 'detail' in e && typeof e.detail === 'number' ? e.detail : 1),
    key: isKey ? e.key : undefined,
    raw: e
  }
}

/**
 * Wraps the framework-agnostic interaction dispatcher for a canvas, building
 * hit-test stacks from the editor's current scope and translating DOM events
 * into `InteractionEvent`s.
 */
export function useCanvasInteraction(editor: Editor): CanvasInteraction {
  const dispatcher: InteractionDispatcher = createInteractionDispatcher(() => editor.graph)
  let hoverStack: SceneNode[] = []
  let unsubscribeDeleted: (() => void) | null = null

  function subscribeToGraphCleanup() {
    unsubscribeDeleted?.()
    unsubscribeDeleted = editor.graph.onNodeEvents({
      deleted: (id) => dispatcher.onNodeDeleted(id)
    })
  }
  subscribeToGraphCleanup()
  const unsubscribeReplaced = editor.onEditorEvent('graph:replaced', () =>
    subscribeToGraphCleanup()
  )

  onScopeDispose(() => {
    unsubscribeDeleted?.()
    unsubscribeReplaced?.()
    dispatcher.clear()
  })

  function stackAt(cx: number, cy: number): SceneNode[] {
    const pageId = editor.state.currentPageId
    const scope = editor.state.enteredContainerId ?? pageId
    const target = editor.graph.hitTestDeep(cx, cy, scope)
    const page = editor.graph.getNode(pageId)
    if (!target) return page ? [page] : []
    return [page, ...getAncestorStack(editor.graph, target.id, pageId)].filter(
      (n): n is SceneNode => n !== undefined
    )
  }

  function updateHover(next: SceneNode[], init: InteractionEventInit) {
    dispatcher.dispatchHoverChange(hoverStack, next, init)
    hoverStack = next
  }

  function dispatch(
    type: InteractionEventType,
    e: PointerLike,
    cx: number,
    cy: number,
    sx: number,
    sy: number,
    opts: { updateHover?: boolean; clickCount?: number } = {}
  ): InteractionEvent {
    const stack = stackAt(cx, cy)
    const init = buildInit(e, cx, cy, sx, sy, opts.clickCount)
    const event = dispatcher.dispatchStack(stack, type, init)
    if (opts.updateHover) updateHover(stack, init)
    return event
  }

  function dispatchStack(
    type: InteractionEventType,
    e: PointerLike,
    stack: SceneNode[],
    opts: { clickCount?: number } = {}
  ): InteractionEvent {
    return dispatcher.dispatchStack(stack, type, buildInit(e, 0, 0, 0, 0, opts.clickCount))
  }

  function on(nodeId: string, type: InteractionEventType, handler: InteractionHandler) {
    return dispatcher.on(nodeId, type, handler)
  }

  function resetHover() {
    if (hoverStack.length === 0) return
    dispatcher.dispatchHoverChange(hoverStack, [], {})
    hoverStack = []
  }

  return {
    stackAt,
    dispatch,
    dispatchStack,
    on,
    clear: () => dispatcher.clear(),
    hasListeners: () => dispatcher.hasListeners(),
    resetHover
  }
}
