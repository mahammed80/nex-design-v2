import type { Vector } from '#core/types'

/**
 * Scene-node interaction events, dispatched capture -> target -> bubble over
 * the hit-test ancestry stack.
 */
export type InteractionEventType =
  | 'pointerenter'
  | 'pointerleave'
  | 'pointermove'
  | 'pointerdown'
  | 'pointerup'
  | 'click'
  | 'dblclick'
  | 'tripleclick'
  | 'contextmenu'
  | 'wheel'
  | 'keydown'
  | 'keyup'
  | 'focus'
  | 'blur'
  | 'dragstart'
  | 'drag'
  | 'dragend'
  | 'dragover'
  | 'drop'
  | 'hover'
  | 'selectionchange'

export type InteractionEventPhase = 'capture' | 'target' | 'bubble'

export interface InteractionEventInit {
  point?: Vector | null
  screenPoint?: Vector | null
  button?: number
  shiftKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  clickCount?: number
  key?: string
  raw?: unknown
}

export interface InteractionEvent {
  readonly type: InteractionEventType
  /** The node currently being visited during the dispatch walk. */
  phase: InteractionEventPhase
  /** The deepest node of the hit-test stack (or the graph root for empty stacks). */
  readonly targetId: string
  /** The node whose listeners are currently running. */
  currentTargetId: string
  readonly point: Vector | null
  readonly screenPoint: Vector | null
  readonly button: number
  readonly modifiers: Readonly<{ shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }>
  readonly clickCount: number
  readonly key: string | null
  readonly raw: unknown
  defaultPrevented: boolean
  propagationStopped: boolean
  immediateStopped: boolean
  stopPropagation: () => void
  stopImmediatePropagation: () => void
  preventDefault: () => void
}

export type InteractionHandler = (event: InteractionEvent) => void
