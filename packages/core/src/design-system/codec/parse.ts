import { parse as parseYaml } from 'yaml'

import { tryParseColor } from '#core/color'
import {
  DESIGN_MD_VERSION,
  emptyDesignSystem,
  type ComponentToken,
  type DesignDiagnostic,
  type DesignSystemDoc,
  type ParsedDesignMd,
  type TypographyToken
} from '#core/design-system/types'

import { isLegacyDesignMd, parseLegacyDesignMd } from './legacy'
import { parseDimension } from './units'

const FRONT_MATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/
const TOKEN_REF = /^\{([a-z]+)\.([^}]+)\}$/i

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  return value === undefined || value === null ? '' : String(value)
}

class Reader {
  readonly diagnostics: DesignDiagnostic[] = []

  warn(path: string, message: string) {
    this.diagnostics.push({ severity: 'warning', path, message })
  }

  error(path: string, message: string) {
    this.diagnostics.push({ severity: 'error', path, message })
  }

  group(raw: Raw, key: string): Raw {
    const value = raw[key]
    if (value === undefined || value === null) return {}
    if (isRecord(value)) return value
    this.error(key, `Expected a mapping of tokens, got ${typeof value}.`)
    return {}
  }

  color(path: string, value: unknown): string | null {
    const text = asText(value).trim()
    if (TOKEN_REF.test(text)) return text
    if (tryParseColor(text)) return text
    this.error(path, `"${text}" is not a valid CSS color.`)
    return null
  }

  dimension(path: string, value: unknown): number | null {
    const amount = parseDimension(value)
    if (amount === null) this.error(path, `"${asText(value)}" is not a dimension (e.g. 8px).`)
    return amount
  }
}

function readColors(reader: Reader, raw: Raw): DesignSystemDoc['colors'] {
  const colors: DesignSystemDoc['colors'] = {}
  for (const [name, value] of Object.entries(reader.group(raw, 'colors'))) {
    const path = `colors.${name}`
    if (isRecord(value)) {
      const byMode: Record<string, string> = {}
      for (const [mode, modeValue] of Object.entries(value)) {
        const color = reader.color(`${path}.${mode}`, modeValue)
        if (color) byMode[mode] = color
      }
      if (Object.keys(byMode).length > 0) colors[name] = byMode
    } else {
      const color = reader.color(path, value)
      if (color) colors[name] = color
    }
  }
  return colors
}

function readTypography(reader: Reader, raw: Raw): DesignSystemDoc['typography'] {
  const typography: DesignSystemDoc['typography'] = {}
  for (const [name, value] of Object.entries(reader.group(raw, 'typography'))) {
    const path = `typography.${name}`
    if (!isRecord(value)) {
      reader.error(
        path,
        'Expected fontFamily / fontSize / fontWeight / lineHeight / letterSpacing.'
      )
      continue
    }
    const token: TypographyToken = {}
    if (value.fontFamily !== undefined) token.fontFamily = asText(value.fontFamily)
    if (value.fontFeature !== undefined) token.fontFeature = asText(value.fontFeature)
    for (const key of ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const) {
      if (value[key] === undefined) continue
      const amount = reader.dimension(`${path}.${key}`, value[key])
      if (amount !== null) token[key] = amount
    }
    typography[name] = token
  }
  return typography
}

function readDimensions(
  reader: Reader,
  raw: Raw,
  key: 'rounded' | 'spacing'
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [name, value] of Object.entries(reader.group(raw, key))) {
    const amount = reader.dimension(`${key}.${name}`, value)
    if (amount !== null) result[name] = amount
  }
  return result
}

function readComponents(reader: Reader, raw: Raw): DesignSystemDoc['components'] {
  const components: DesignSystemDoc['components'] = {}
  for (const [name, value] of Object.entries(reader.group(raw, 'components'))) {
    if (!isRecord(value)) {
      reader.warn(`components.${name}`, 'Expected a mapping of component properties.')
      continue
    }
    const component: ComponentToken = {}
    for (const [prop, propValue] of Object.entries(value)) {
      component[prop] = typeof propValue === 'number' ? propValue : asText(propValue)
    }
    components[name] = component
  }
  return components
}

/** Report `{group.name}` references that point at tokens the document doesn't define. */
function checkReferences(reader: Reader, doc: DesignSystemDoc) {
  const groups: Record<string, Record<string, unknown>> = {
    colors: doc.colors,
    typography: doc.typography,
    rounded: doc.rounded,
    spacing: doc.spacing
  }
  const check = (path: string, value: unknown) => {
    const match = typeof value === 'string' ? value.match(TOKEN_REF) : null
    if (!match) return
    const [, group, name] = match
    if (!groups[group] || !(name in groups[group]))
      reader.warn(path, `Unknown token reference ${value}.`)
  }
  for (const [name, value] of Object.entries(doc.colors)) {
    if (typeof value === 'string') check(`colors.${name}`, value)
    else
      for (const [mode, modeValue] of Object.entries(value))
        check(`colors.${name}.${mode}`, modeValue)
  }
  for (const [name, component] of Object.entries(doc.components)) {
    for (const [prop, value] of Object.entries(component))
      check(`components.${name}.${prop}`, value)
  }
}

/** LF line endings, no surrounding blank lines, one trailing newline when non-empty. */
export function normalizeBody(body: string): string {
  const trimmed = body.replace(/\r\n?/g, '\n').trim()
  return trimmed ? `${trimmed}\n` : ''
}

export function parseDesignMd(text: string): ParsedDesignMd {
  const match = text.match(FRONT_MATTER)
  if (!match) {
    if (isLegacyDesignMd(text)) {
      return { doc: parseLegacyDesignMd(text), format: 'legacy', diagnostics: [] }
    }
    const doc = emptyDesignSystem(text.match(/^#\s+(.+)$/m)?.[1]?.trim())
    doc.body = normalizeBody(text)
    return {
      doc,
      format: 'yaml',
      diagnostics: text.trim()
        ? [{ severity: 'warning', path: '', message: 'No YAML front-matter (--- … ---) found.' }]
        : []
    }
  }

  const reader = new Reader()
  let raw: unknown
  try {
    raw = parseYaml(match[1])
  } catch (error) {
    reader.error(
      '',
      `Invalid YAML front-matter: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  const front = isRecord(raw) ? raw : {}
  if (raw !== undefined && raw !== null && !isRecord(raw))
    reader.error('', 'Front-matter must be a mapping.')

  const doc: DesignSystemDoc = {
    version: asText(front.version) || DESIGN_MD_VERSION,
    name: asText(front.name) || 'NexDesign System',
    description: asText(front.description),
    colors: readColors(reader, front),
    typography: readTypography(reader, front),
    rounded: readDimensions(reader, front, 'rounded'),
    spacing: readDimensions(reader, front, 'spacing'),
    components: readComponents(reader, front),
    body: normalizeBody(match[2])
  }
  checkReferences(reader, doc)
  return { doc, format: 'yaml', diagnostics: reader.diagnostics }
}
