import type {
  Action,
  ActionType,
  DragDirection,
  EasingType,
  OverlayPosition,
  Transition,
  TransitionDirection,
  TransitionType,
  TriggerType
} from '@nex-design/core/scene-graph'

export const TRIGGER_OPTIONS: ReadonlyArray<{ value: TriggerType; label: string }> = [
  { value: 'ON_CLICK', label: 'On click' },
  { value: 'ON_HOVER', label: 'While hovering' },
  { value: 'ON_PRESS', label: 'While pressing' },
  { value: 'MOUSE_ENTER', label: 'Mouse enter' },
  { value: 'MOUSE_LEAVE', label: 'Mouse leave' },
  { value: 'MOUSE_DOWN', label: 'Mouse down' },
  { value: 'MOUSE_UP', label: 'Mouse up' },
  { value: 'ON_DRAG', label: 'On drag' },
  { value: 'ON_KEY_DOWN', label: 'Key / gamepad' },
  { value: 'AFTER_DELAY', label: 'After delay' }
]

export const ACTION_OPTIONS: ReadonlyArray<{ value: ActionType; label: string }> = [
  { value: 'NAVIGATE', label: 'Navigate to' },
  { value: 'CHANGE_TO', label: 'Change to' },
  { value: 'OPEN_OVERLAY', label: 'Open overlay' },
  { value: 'SWAP_OVERLAY', label: 'Swap overlay' },
  { value: 'CLOSE', label: 'Close overlay' },
  { value: 'SCROLL_TO', label: 'Scroll to' },
  { value: 'BACK', label: 'Back' },
  { value: 'URL', label: 'Open link' },
  { value: 'SET_VARIABLE', label: 'Set variable' }
]

export const TRANSITION_OPTIONS: ReadonlyArray<{ value: TransitionType; label: string }> = [
  { value: 'INSTANT', label: 'Instant' },
  { value: 'DISSOLVE', label: 'Dissolve' },
  { value: 'SMART', label: 'Smart animate' },
  { value: 'MOVE_IN', label: 'Move in' },
  { value: 'MOVE_OUT', label: 'Move out' },
  { value: 'PUSH', label: 'Push' },
  { value: 'SLIDE_IN', label: 'Slide in' },
  { value: 'SLIDE_OUT', label: 'Slide out' }
]

export const EASING_OPTIONS: ReadonlyArray<{ value: EasingType; label: string }> = [
  { value: 'LINEAR', label: 'Linear' },
  { value: 'EASE_IN', label: 'Ease in' },
  { value: 'EASE_OUT', label: 'Ease out' },
  { value: 'EASE_IN_AND_OUT', label: 'Ease in and out' },
  { value: 'BOUNCE', label: 'Ease out back' },
  { value: 'SPRING', label: 'Spring' }
]

export const OVERLAY_POSITION_OPTIONS: ReadonlyArray<{ value: OverlayPosition; label: string }> = [
  { value: 'CENTER', label: 'Centered' },
  { value: 'TOP_CENTER', label: 'Top center' },
  { value: 'BOTTOM_CENTER', label: 'Bottom center' },
  { value: 'MANUAL', label: 'Manual' }
]

export const DRAG_DIRECTION_OPTIONS: ReadonlyArray<{ value: DragDirection; label: string }> = [
  { value: 'left', label: 'Swipe left' },
  { value: 'right', label: 'Swipe right' },
  { value: 'up', label: 'Swipe up' },
  { value: 'down', label: 'Swipe down' }
]

export const TRANSITION_DIRECTIONS: ReadonlyArray<{
  value: TransitionDirection
  label: string
  icon: 'left' | 'right' | 'up' | 'down'
}> = [
  { value: 'LEFT', label: 'From left', icon: 'right' },
  { value: 'RIGHT', label: 'From right', icon: 'left' },
  { value: 'TOP', label: 'From top', icon: 'down' },
  { value: 'BOTTOM', label: 'From bottom', icon: 'up' }
]

export const DIRECTIONAL_TRANSITIONS: ReadonlySet<TransitionType> = new Set([
  'PUSH',
  'SLIDE_IN',
  'SLIDE_OUT',
  'MOVE_IN',
  'MOVE_OUT'
])

/** Actions that target a frame on the page. */
export const FRAME_ACTIONS: ReadonlySet<ActionType> = new Set([
  'NAVIGATE',
  'OPEN_OVERLAY',
  'SWAP_OVERLAY'
])
/** Actions that animate between states. */
export const ANIMATED_ACTIONS: ReadonlySet<ActionType> = new Set([
  'NAVIGATE',
  'CHANGE_TO',
  'OPEN_OVERLAY',
  'SWAP_OVERLAY'
])
export const OVERLAY_ACTIONS: ReadonlySet<ActionType> = new Set(['OPEN_OVERLAY', 'SWAP_OVERLAY'])

export const DEFAULT_TRANSITION_MS = 300
export const DEFAULT_DELAY_MS = 1000

export function defaultTransition(): Transition {
  return { type: 'INSTANT', duration: DEFAULT_TRANSITION_MS, easing: 'EASE_OUT' }
}

/** A fresh action of `type`, keeping a compatible destination from the previous action. */
export function actionOfType(
  type: ActionType,
  previous: Action | undefined,
  defaults: { frameId?: string; variantId?: string; layerId?: string }
): Action {
  const action: Action = { type }
  if (FRAME_ACTIONS.has(type)) {
    action.destinationId =
      previous && FRAME_ACTIONS.has(previous.type) ? previous.destinationId : defaults.frameId
  } else if (type === 'CHANGE_TO') {
    action.destinationId = defaults.variantId
  } else if (type === 'SCROLL_TO') {
    action.destinationId = defaults.layerId
  } else if (type === 'URL') {
    action.url = 'https://'
  }
  if (ANIMATED_ACTIONS.has(type)) action.transition = previous?.transition ?? defaultTransition()
  if (OVERLAY_ACTIONS.has(type)) {
    action.overlay = {
      position: 'CENTER',
      backdrop: true,
      backdropOpacity: 0.5,
      closeOnOutsideClick: true
    }
  }
  return action
}
