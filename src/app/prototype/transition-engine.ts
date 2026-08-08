import type { TransitionType, TransitionDirection } from './types'

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
