export const FONT_WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black'
}

export function normalizeFontFamily(family: string): string {
  return family.replace(/\s+(Variable|\d+(?:pt|px|em))$/i, '')
}

export function styleToVariant(style: string): string {
  const weight = styleToWeight(style)
  const italic = style.toLowerCase().includes('italic')
  if (weight === 400 && !italic) return 'regular'
  if (weight === 400 && italic) return 'italic'
  return italic ? `${weight}italic` : `${weight}`
}

export function styleToWeight(style: string): number {
  const s = style.toLowerCase().replace(/[\s-_]/g, '')
  if (s.includes('thin') || s.includes('hairline')) return 100
  if (s.includes('extralight') || s.includes('ultralight')) return 200
  if (s.includes('light')) return 300
  if (s.includes('medium')) return 500
  if (s.includes('semibold') || s.includes('demibold')) return 600
  if (s.includes('extrabold') || s.includes('ultrabold')) return 800
  if (s.includes('black') || s.includes('heavy')) return 900
  if (s.includes('bold')) return 700
  return 400
}

export function weightToStyle(weight: number, italic = false): string {
  const rounded = Math.round(weight / 100) * 100
  const label = (FONT_WEIGHT_NAMES[rounded] ?? 'Regular').replace(/ /g, '')
  return italic ? `${label} Italic` : label
}

export function isVariableFont(data: ArrayBuffer): boolean {
  if (data.byteLength < 12) return false
  const view = new DataView(data)
  const numTables = view.getUint16(4)
  for (let i = 0; i < numTables && 12 + i * 16 + 4 <= data.byteLength; i++) {
    const tag = String.fromCharCode(
      view.getUint8(12 + i * 16),
      view.getUint8(12 + i * 16 + 1),
      view.getUint8(12 + i * 16 + 2),
      view.getUint8(12 + i * 16 + 3)
    )
    if (tag === 'fvar') return true
  }
  return false
}
