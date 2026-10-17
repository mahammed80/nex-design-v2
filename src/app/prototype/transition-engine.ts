import { cubicBezier } from 'motion-v'

import type { EasingType, Transition } from '@nex-design/core/scene-graph'

import type { TransitionType, TransitionDirection } from './types'

type Curve = readonly [number, number, number, number]

/** One easing table for both CSS transitions and JS-driven smart animate. */
const EASING_CURVES: Record<EasingType, Curve> = {
  LINEAR: [0, 0, 1, 1],
  EASE_IN: [0.4, 0, 1, 1],
  EASE_OUT: [0, 0, 0.2, 1],
  EASE_IN_AND_OUT: [0.4, 0, 0.2, 1],
  BOUNCE: [0.34, 1.56, 0.64, 1],
  SPRING: [0.175, 0.885, 0.32, 1.275],
  CUSTOM_CUBIC: [0.4, 0, 0.2, 1],
  CUSTOM_SPRING: [0.175, 0.885, 0.32, 1.275]
}

function isEasing(value: string): value is EasingType {
  return value in EASING_CURVES
}

function curveFor(easing: string): Curve {
  return isEasing(easing) ? EASING_CURVES[easing] : EASING_CURVES.EASE_OUT
}

export function easingCss(easing: string): string {
  const [x1, y1, x2, y2] = curveFor(easing)
  return easing === 'LINEAR' ? 'linear' : `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
}

export function easingFn(easing: string): (t: number) => number {
  const [x1, y1, x2, y2] = curveFor(easing)
  return easing === 'LINEAR' ? (t) => t : cubicBezier(x1, y1, x2, y2)
}

const OPPOSITE: Record<TransitionDirection, TransitionDirection> = {
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
  TOP: 'BOTTOM',
  BOTTOM: 'TOP'
}

/**
 * The transition that visually undoes `transition` (used for Back): push from the left
 * returns with push from the right, slide/move in becomes slide/move out the way it came,
 * and symmetric transitions (instant, dissolve, smart animate) stay the same.
 */
export function inverseTransition(transition: Transition): Transition {
  switch (transition.type) {
    case 'PUSH':
      return {
        ...transition,
        direction: transition.direction ? OPPOSITE[transition.direction] : undefined
      }
    case 'SLIDE_IN':
      return { ...transition, type: 'SLIDE_OUT' }
    case 'SLIDE_OUT':
      return { ...transition, type: 'SLIDE_IN' }
    case 'MOVE_IN':
      return { ...transition, type: 'MOVE_OUT' }
    case 'MOVE_OUT':
      return { ...transition, type: 'MOVE_IN' }
    default:
      return transition
  }
}

export class TransitionEngine {
  resolveTransitionName(type: TransitionType, direction?: TransitionDirection): string {
    if (type === 'SMART') return 'smart-animate'
    const base = type.toLowerCase().replace('_', '-')
    if (
      direction &&
      ['MOVE_IN', 'MOVE_OUT', 'PUSH', 'SLIDE', 'SLIDE_IN', 'SLIDE_OUT'].includes(type)
    ) {
      return `${base}-${direction.toLowerCase()}`
    }
    return base
  }
}
