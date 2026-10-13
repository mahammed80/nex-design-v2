import { formatPx } from '#core/design-system/codec/units'
import type { DesignSystemDoc, TypographyToken } from '#core/design-system/types'

export type DesignExportFormat = 'css' | 'tailwind' | 'json' | 'dtcg'

const REF = /^\{([a-z]+)\.([^}]+)\}$/i
const CSS_PREFIX: Record<string, string> = {
  colors: 'color',
  rounded: 'radius',
  spacing: 'spacing'
}

function cssName(group: string, token: string): string {
  return `--${CSS_PREFIX[group] ?? group}-${token}`
}

/** `{colors.primary}` → `var(--color-primary)`; literals pass through. */
function cssValue(value: string): string {
  const ref = value.match(REF)
  return ref ? `var(${cssName(ref[1], ref[2])})` : value
}

/** Mode keys in document order; the first is the default (`:root`). */
function modeKeys(doc: DesignSystemDoc): string[] {
  const keys = new Set<string>()
  for (const value of Object.values(doc.colors)) {
    if (typeof value !== 'string') for (const key of Object.keys(value)) keys.add(key)
  }
  return [...keys]
}

function colorFor(value: DesignSystemDoc['colors'][string], mode?: string): string | undefined {
  if (typeof value === 'string') return mode ? undefined : value
  const modes = Object.keys(value)
  return mode ? value[mode] : value[modes[0]]
}

function typographyLines(name: string, token: TypographyToken, tailwind: boolean): string[] {
  const lines: string[] = []
  const prefix = tailwind ? '--text' : '--font-size'
  if (token.fontFamily)
    lines.push(`--font-${tailwind ? '' : 'family-'}${name}: ${token.fontFamily};`)
  if (token.fontSize !== undefined) lines.push(`${prefix}-${name}: ${formatPx(token.fontSize)};`)
  const sub = tailwind ? `--text-${name}--` : `--${name}-`
  if (token.lineHeight !== undefined) lines.push(`${sub}line-height: ${token.lineHeight};`)
  if (token.fontWeight !== undefined) lines.push(`${sub}font-weight: ${token.fontWeight};`)
  if (token.letterSpacing !== undefined) {
    lines.push(`${sub}letter-spacing: ${formatPx(token.letterSpacing)};`)
  }
  return lines
}

function cssBlocks(doc: DesignSystemDoc, tailwind: boolean): string {
  const root: string[] = []
  for (const [name, value] of Object.entries(doc.colors)) {
    const color = colorFor(value)
    if (color) root.push(`${cssName('colors', name)}: ${cssValue(color)};`)
  }
  for (const [name, token] of Object.entries(doc.typography)) {
    root.push(...typographyLines(name, token, tailwind))
  }
  for (const group of ['rounded', 'spacing'] as const) {
    for (const [name, value] of Object.entries(doc[group])) {
      root.push(`${cssName(group, name)}: ${formatPx(value)};`)
    }
  }

  const indent = (lines: string[]) => lines.map((line) => `  ${line}`).join('\n')
  const blocks = [`${tailwind ? '@theme' : ':root'} {\n${indent(root)}\n}`]
  for (const mode of modeKeys(doc).slice(1)) {
    const lines: string[] = []
    for (const [name, value] of Object.entries(doc.colors)) {
      const color = colorFor(value, mode)
      if (color) lines.push(`${cssName('colors', name)}: ${cssValue(color)};`)
    }
    if (lines.length > 0) blocks.push(`[data-theme='${mode}'] {\n${indent(lines)}\n}`)
  }
  return `${blocks.join('\n\n')}\n`
}

function tokenJson(doc: DesignSystemDoc) {
  return {
    colors: doc.colors,
    typography: doc.typography,
    rounded: doc.rounded,
    spacing: doc.spacing
  }
}

/** W3C Design Tokens Community Group format (`$type` / `$value`, `{group.token}` aliases). */
function dtcg(doc: DesignSystemDoc) {
  const ref = (value: string) => {
    const match = value.match(REF)
    return match ? `{${match[1] === 'colors' ? 'color' : match[1]}.${match[2]}}` : value
  }
  const color: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(doc.colors)) {
    const base = colorFor(value)
    if (!base) continue
    const modes = typeof value === 'string' ? null : value
    color[name] = {
      $type: 'color',
      $value: ref(base),
      ...(modes && Object.keys(modes).length > 1
        ? {
            $extensions: {
              'com.nexdesign.modes': Object.fromEntries(
                Object.entries(modes).map(([k, v]) => [k, ref(v)])
              )
            }
          }
        : {})
    }
  }
  const typography: Record<string, unknown> = {}
  for (const [name, token] of Object.entries(doc.typography)) {
    typography[name] = {
      $type: 'typography',
      $value: {
        ...(token.fontFamily ? { fontFamily: token.fontFamily } : {}),
        ...(token.fontSize !== undefined ? { fontSize: formatPx(token.fontSize) } : {}),
        ...(token.fontWeight !== undefined ? { fontWeight: token.fontWeight } : {}),
        ...(token.lineHeight !== undefined ? { lineHeight: token.lineHeight } : {}),
        ...(token.letterSpacing !== undefined
          ? { letterSpacing: formatPx(token.letterSpacing) }
          : {})
      }
    }
  }
  const dimension = (values: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        name,
        { $type: 'dimension', $value: formatPx(value) }
      ])
    )
  return { color, typography, rounded: dimension(doc.rounded), spacing: dimension(doc.spacing) }
}

export function exportDesignTokens(doc: DesignSystemDoc, format: DesignExportFormat): string {
  switch (format) {
    case 'css':
      return cssBlocks(doc, false)
    case 'tailwind':
      return `@import 'tailwindcss';\n\n${cssBlocks(doc, true)}`
    case 'json':
      return `${JSON.stringify(tokenJson(doc), null, 2)}\n`
    case 'dtcg':
      return `${JSON.stringify(dtcg(doc), null, 2)}\n`
  }
}
