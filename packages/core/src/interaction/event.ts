import type { InteractionEvent, InteractionEventInit, InteractionEventType } from './types'

export function createInteractionEvent(
  type: InteractionEventType,
  targetId: string,
  init: InteractionEventInit = {}
): InteractionEvent {
  const event: InteractionEvent = {
    type,
    phase: 'target',
    targetId,
    currentTargetId: targetId,
    point: init.point ?? null,
    screenPoint: init.screenPoint ?? null,
    button: init.button ?? 0,
    modifiers: {
      shift: init.shiftKey ?? false,
      ctrl: init.ctrlKey ?? false,
      alt: init.altKey ?? false,
      meta: init.metaKey ?? false
    },
    clickCount: init.clickCount ?? 1,
    key: init.key ?? null,
    raw: init.raw,
    defaultPrevented: false,
    propagationStopped: false,
    immediateStopped: false,
    stopPropagation: () => {
      event.propagationStopped = true
    },
    stopImmediatePropagation: () => {
      event.propagationStopped = true
      event.immediateStopped = true
    },
    preventDefault: () => {
      event.defaultPrevented = true
    }
  }
  return event
}
