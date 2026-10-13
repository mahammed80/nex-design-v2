const PX_PER_REM = 16

/** `56px` → 56, `1.5rem` → 24, `-1.4px` → -1.4, `1.03` → 1.03; null when not a dimension. */
export function parseDimension(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(-?\d*\.?\d+)\s*(px|rem|em)?$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2]?.toLowerCase()
  return unit === 'rem' || unit === 'em' ? amount * PX_PER_REM : amount
}

/** Dimensions are written back in px, matching the bundled templates. */
export function formatPx(value: number): string {
  return `${Number(value.toFixed(3))}px`
}
