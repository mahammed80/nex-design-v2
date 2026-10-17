import type { Vector } from '#core/types'

export type TriggerType =
  | 'ON_CLICK'
  | 'ON_HOVER'
  | 'ON_PRESS'
  | 'MOUSE_ENTER'
  | 'MOUSE_LEAVE'
  | 'MOUSE_DOWN'
  | 'MOUSE_UP'
  | 'AFTER_DELAY'
  | 'ON_DRAG'
  | 'ON_KEY_DOWN'

export type ActionType =
  | 'BACK'
  | 'CLOSE'
  | 'NAVIGATE'
  | 'URL'
  | 'OPEN_OVERLAY'
  | 'SWAP_OVERLAY'
  | 'CHANGE_TO'
  | 'SET_VARIABLE'
  | 'SCROLL_TO'

export type TransitionType =
  | 'INSTANT'
  | 'DISSOLVE'
  | 'SMART'
  | 'MOVE_IN'
  | 'MOVE_OUT'
  | 'PUSH'
  | 'SLIDE_IN'
  | 'SLIDE_OUT'

export type EasingType =
  | 'LINEAR'
  | 'EASE_IN'
  | 'EASE_OUT'
  | 'EASE_IN_AND_OUT'
  | 'BOUNCE'
  | 'SPRING'
  | 'CUSTOM_CUBIC'
  | 'CUSTOM_SPRING'

/** Direction for PUSH / SLIDE_IN / SLIDE_OUT / MOVE_IN / MOVE_OUT transitions. */
export type TransitionDirection = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM'

export interface Transition {
  type: TransitionType
  duration: number
  easing: EasingType
  direction?: TransitionDirection
  /** Native Figma easing parameters. Cubic curves use four values; springs may use more. */
  easingFunction?: number[]
}

export type OverlayPosition = 'CENTER' | 'TOP_CENTER' | 'BOTTOM_CENTER' | 'MANUAL'

export interface OverlaySettings {
  position?: OverlayPosition
  /** Overlay top-left relative to the source frame, used when `position` is MANUAL. */
  offset?: Vector
  backdrop?: boolean
  backdropOpacity?: number
  closeOnOutsideClick?: boolean
}

export interface Action {
  type: ActionType
  destinationId?: string
  url?: string
  transition?: Transition
  variantProperties?: Record<string, string>
  variableId?: string
  variableValue?: unknown
  overlay?: OverlaySettings
  preserveScrollPosition?: boolean
  scrollOffset?: Vector
}

export type DragDirection = 'left' | 'right' | 'up' | 'down'

export interface Trigger {
  type: TriggerType
  delay?: number
  direction?: DragDirection
  /** `KeyboardEvent.code` values for ON_KEY_DOWN, e.g. `['ArrowRight']`. */
  keys?: string[]
}

export interface PrototypeFlow {
  name: string
  startNodeId: string
  description?: string
}

export type PrototypeScrollDirection = 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'BOTH'

export type PrototypeScrollBehavior = 'SCROLLS' | 'FIXED_WHEN_CHILD_OF_SCROLLING_FRAME'

export interface PrototypeDevice {
  type: 'NONE' | 'PRESET' | 'CUSTOM' | 'PRESENTATION'
  size: Vector
  presetIdentifier: string
  rotation: 'NONE' | 'CCW_90'
}

export interface Reaction {
  trigger: Trigger
  actions: Action[]
}
