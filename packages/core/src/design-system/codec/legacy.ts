import {
  emptyDesignSystem,
  type DesignSystemDoc,
  type TypographyToken
} from '#core/design-system/types'

import { parseDimension } from './units'

/**
 * The pre-v2 bullet format (`# Title`, `## Colors` with ``- `name`: `value` `` lines). Kept
 * readable so existing presets and saved files import cleanly; serialization always emits v2.
 */

function section(markdown: string, heading: string): string[] {
  // `(?![\s\S])` is end-of-input; `$` would match end-of-line under the `m` flag.
  const match = markdown.match(
    new RegExp(`^## ${heading}[ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |(?![\\s\\S]))`, 'im')
  )
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
}

function pairs(lines: string[]): Array<[string, string]> {
  const result: Array<[string, string]> = []
  for (const line of lines) {
    const match = line.match(/^-\s+`?([^`:]+)`?\s*:\s*`?([^`]+?)`?\s*$/)
    if (match) result.push([match[1].trim(), match[2].trim()])
  }
  return result
}

function stripPrefix(name: string, prefixes: string[]): string {
  for (const prefix of prefixes) if (name.startsWith(prefix)) return name.slice(prefix.length)
  return name
}

export function isLegacyDesignMd(markdown: string): boolean {
  return /^## (Colors|Typography|Spacing)\s*$/im.test(markdown)
}

export function parseLegacyDesignMd(markdown: string): DesignSystemDoc {
  const doc = emptyDesignSystem(markdown.match(/^#\s+(.+)$/m)?.[1]?.trim())
  doc.description = section(markdown, 'Direction')[0]?.replace(/^-\s*/, '') ?? ''

  for (const [name, value] of pairs(section(markdown, 'Colors'))) {
    doc.colors[stripPrefix(name, ['color-', 'colors/'])] = value
  }

  const typography = (key: string): TypographyToken => (doc.typography[key] ??= {})
  for (const [name, value] of pairs(section(markdown, 'Typography'))) {
    if (name.startsWith('font-size-')) {
      const size = parseDimension(value)
      if (size !== null) typography(name.slice('font-size-'.length)).fontSize = size
    } else if (name.startsWith('font-weight-')) {
      const weight = parseDimension(value)
      if (weight !== null) typography(name.slice('font-weight-'.length)).fontWeight = weight
    } else {
      typography(stripPrefix(name, ['font-family-', 'font-'])).fontFamily = value
    }
  }

  for (const [name, value] of pairs(section(markdown, 'Spacing'))) {
    const amount = parseDimension(value)
    if (amount === null) continue
    if (/^(radius|rounded)-/.test(name))
      doc.rounded[stripPrefix(name, ['radius-', 'rounded-'])] = amount
    else doc.spacing[stripPrefix(name, ['spacing-', 'space-'])] = amount
  }

  const principles = section(markdown, 'Principles').map((line) => line.replace(/^-\s*/, ''))
  if (principles.length > 0) {
    doc.body = `## Principles\n\n${principles.map((p) => `- ${p}`).join('\n')}\n`
  }
  return doc
}
