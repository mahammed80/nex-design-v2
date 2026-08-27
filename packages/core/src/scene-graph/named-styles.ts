/**
 * Named style presets * color (paint), text, and effect styles.
 * Analogous to Figma's Local Styles panel.
 */
import type { Effect, Fill } from './types'

export type StyleType = 'PAINT' | 'TEXT' | 'EFFECT'

export interface PaintStylePreset {
  id: string
  name: string
  type: 'PAINT'
  fills: Fill[]
  description?: string
}

export interface TextStylePreset {
  id: string
  name: string
  type: 'TEXT'
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic?: boolean
  lineHeight?: number | null
  letterSpacing?: number
  textCase?: string
  description?: string
}

export interface EffectStylePreset {
  id: string
  name: string
  type: 'EFFECT'
  effects: Effect[]
  description?: string
}

export type NamedStylePreset = PaintStylePreset | TextStylePreset | EffectStylePreset

export class NamedStyleRegistry {
  private styles = new Map<string, NamedStylePreset>()

  add(style: NamedStylePreset): void {
    this.styles.set(style.id, style)
  }

  remove(id: string): boolean {
    return this.styles.delete(id)
  }

  get(id: string): NamedStylePreset | undefined {
    return this.styles.get(id)
  }

  getAll(): NamedStylePreset[] {
    return [...this.styles.values()]
  }

  getByType(type: StyleType): NamedStylePreset[] {
    return this.getAll().filter((s) => s.type === type)
  }

  update(id: string, patch: Partial<NamedStylePreset>): boolean {
    const existing = this.styles.get(id)
    if (!existing) return false
    this.styles.set(id, { ...existing, ...patch } as NamedStylePreset)
    return true
  }

  toJSON(): NamedStylePreset[] {
    return this.getAll()
  }

  fromJSON(styles: NamedStylePreset[]): void {
    this.styles.clear()
    for (const s of styles) {
      this.styles.set(s.id, s)
    }
  }
}
