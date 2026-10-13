import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseDesignMd, serializeDesignMd } from '@nex-design/core/design-system'

const TEMPLATE_DIR = resolve(import.meta.dirname, '../../../src/app/design-system/templates')
const templates = readdirSync(TEMPLATE_DIR).filter((file) => file.endsWith('.md'))

describe('DESIGN.md v2 codec', () => {
  test('parses every bundled template without errors', () => {
    expect(templates.length).toBeGreaterThanOrEqual(10)
    for (const file of templates) {
      const { doc, format, diagnostics } = parseDesignMd(
        readFileSync(resolve(TEMPLATE_DIR, file), 'utf8')
      )
      const errors = diagnostics.filter((d) => d.severity === 'error')
      expect({ file, errors }).toEqual({ file, errors: [] })
      expect(format).toBe('yaml')
      expect(Object.keys(doc.colors).length).toBeGreaterThan(0)
      expect(Object.keys(doc.typography).length).toBeGreaterThan(0)
      expect(doc.body.length).toBeGreaterThan(0)
    }
  })

  test('reads dimensions, typography, and components from front-matter', () => {
    const { doc } = parseDesignMd(readFileSync(resolve(TEMPLATE_DIR, 'stripe-DESIGN.md'), 'utf8'))
    expect(doc.colors.primary).toBe('#533afd')
    expect(doc.typography['display-xxl']).toEqual({
      fontFamily: "sohne-var, 'SF Pro Display', system-ui, -apple-system, sans-serif",
      fontSize: 56,
      fontWeight: 300,
      lineHeight: 1.03,
      letterSpacing: -1.4,
      fontFeature: 'ss01'
    })
    expect(doc.rounded.pill).toBe(9999)
    expect(doc.spacing.huge).toBe(64)
    expect(doc.components['button-primary-pill'].backgroundColor).toBe('{colors.primary}')
    expect(doc.body.startsWith('## Overview')).toBe(true)
  })

  test('serialize → parse is lossless for templates', () => {
    for (const file of templates) {
      const first = parseDesignMd(readFileSync(resolve(TEMPLATE_DIR, file), 'utf8')).doc
      const second = parseDesignMd(serializeDesignMd(first)).doc
      expect({ file, doc: second }).toEqual({ file, doc: first })
    }
  })

  test('reads the legacy bullet format and upgrades it to v2', () => {
    const legacy = [
      '# Crimson',
      '',
      '## Direction',
      '- Bold and dark.',
      '',
      '## Colors',
      '- `brand-primary`: `#e11d48`',
      '',
      '## Typography',
      '- `font-family-primary`: `Inter`',
      '- `font-size-h1`: 36',
      '',
      '## Spacing',
      '- `space-md`: 16',
      '',
      '## Principles',
      '- Keep contrast high.'
    ].join('\n')
    const { doc, format } = parseDesignMd(legacy)
    expect(format).toBe('legacy')
    expect(doc).toMatchObject({
      name: 'Crimson',
      description: 'Bold and dark.',
      colors: { 'brand-primary': '#e11d48' },
      typography: { primary: { fontFamily: 'Inter' }, h1: { fontSize: 36 } },
      spacing: { md: 16 }
    })
    expect(doc.body).toContain('Keep contrast high.')
    expect(serializeDesignMd(doc).startsWith('---\nversion: alpha\nname: Crimson')).toBe(true)
  })

  test('reports invalid colors, bad dimensions, and dangling references', () => {
    const { diagnostics } = parseDesignMd(
      [
        '---',
        'colors:',
        '  primary: "not-a-color"',
        '  accent: "{colors.missing}"',
        'spacing:',
        '  md: wide',
        '---'
      ].join('\n')
    )
    expect(diagnostics).toContainEqual({
      severity: 'error',
      path: 'colors.primary',
      message: '"not-a-color" is not a valid CSS color.'
    })
    expect(diagnostics.some((d) => d.path === 'spacing.md' && d.severity === 'error')).toBe(true)
    expect(diagnostics.some((d) => d.path === 'colors.accent' && d.severity === 'warning')).toBe(
      true
    )
  })

  test('invalid YAML is reported instead of throwing', () => {
    const { diagnostics } = parseDesignMd('---\ncolors: [unclosed\n---\n')
    expect(diagnostics[0]?.severity).toBe('error')
  })
})
