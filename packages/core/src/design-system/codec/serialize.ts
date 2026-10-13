import { stringify } from 'yaml'

import type { DesignSystemDoc, TypographyToken } from '#core/design-system/types'

import { formatPx } from './units'

function typographyToYaml(token: TypographyToken): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (token.fontFamily !== undefined) out.fontFamily = token.fontFamily
  if (token.fontSize !== undefined) out.fontSize = formatPx(token.fontSize)
  if (token.fontWeight !== undefined) out.fontWeight = token.fontWeight
  if (token.lineHeight !== undefined) out.lineHeight = token.lineHeight
  if (token.letterSpacing !== undefined) out.letterSpacing = formatPx(token.letterSpacing)
  if (token.fontFeature !== undefined) out.fontFeature = token.fontFeature
  return out
}

function dimensions(values: Record<string, number>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, formatPx(value)]))
}

function nonEmpty<T extends object>(value: T): T | undefined {
  return Object.keys(value).length > 0 ? value : undefined
}

/** Always emits v2: YAML front-matter (key order matches the templates) + the prose body. */
export function serializeDesignMd(doc: DesignSystemDoc): string {
  const front = {
    version: doc.version,
    name: doc.name,
    description: doc.description || undefined,
    colors: nonEmpty(doc.colors),
    typography: nonEmpty(
      Object.fromEntries(
        Object.entries(doc.typography).map(([name, token]) => [name, typographyToYaml(token)])
      )
    ),
    rounded: nonEmpty(dimensions(doc.rounded)),
    spacing: nonEmpty(dimensions(doc.spacing)),
    components: nonEmpty(doc.components)
  }
  const yaml = stringify(front, { lineWidth: 0 }).trimEnd()
  const body = doc.body.trim()
  return `---\n${yaml}\n---\n${body ? `\n${body}\n` : ''}`
}
