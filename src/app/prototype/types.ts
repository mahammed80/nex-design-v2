import type { Transition } from '@nex-design/core/scene-graph'

export type { TransitionDirection, TransitionType } from '@nex-design/core/scene-graph'

export type ZoomMode = 'FIT' | 'FILL' | '100%'

export type DeviceType = 'NONE' | 'IPHONE' | 'ANDROID' | 'TABLET' | 'DESKTOP'

export interface DevicePreset {
  name: string
  width: number
  height: number
  bezel: number
  radius: number
  hasNotch?: boolean
  hasHomeIndicator?: boolean
  os: 'ios' | 'android' | 'desktop' | 'none'
}

export interface PresentationState {
  isOpen: boolean
  activeFrameId: string
  zoomMode: ZoomMode
  customZoom: number // scale factor (e.g. 1.0)
  deviceType: DeviceType
  showDeviceFrame: boolean
  isFullscreen: boolean
  transitionName: string // CSS transition name (e.g. 'dissolve', 'push-left')
  transitionDuration: number // in ms
  transitionEasing?: string
  /** The full transition behind the current screen change (smart animate reads it). */
  transition?: Transition
  /** Screen shown before `activeFrameId`; the smart-animate source. */
  previousFrameId?: string
  scrollTargetId?: string
}
