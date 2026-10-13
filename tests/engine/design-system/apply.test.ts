import { describe, expect, test } from 'bun:test'

import {
  applyDesignSystem,
  buildDesignMd,
  ensureStyleGuidePage,
  exportDesignTokens,
  findStyleGuidePage,
  getStoredDesignMd,
  parseDesignMd,
  planDesignApply,
  readDesignSystem,
  restoreDesignState,
  snapshotDesignState
} from '@nex-design/core/design-system'
import { SceneGraph } from '@nex-design/core/scene-graph'

const DOC = parseDesignMd(
  [
    '---',
    'version: alpha',
    'name: Test System',
    'colors:',
    '  primary: "#533afd"',
    '  on-primary: "#ffffff"',
    '  link: "{colors.primary}"',
    '  surface:',
    '    light: "#ffffff"',
    '    dark: "#09090b"',
    'typography:',
    '  body:',
    '    fontFamily: Inter',
    '    fontSize: 16px',
    '    lineHeight: 1.5',
    'rounded:',
    '  md: 8px',
    'spacing:',
    '  md: 12px',
    'components:',
    '  button:',
    '    backgroundColor: "{colors.primary}"',
    '---',
    '',
    '## Overview',
    '',
    'Prose that must survive.'
  ].join('\n')
).doc

function names(graph: SceneGraph): string[] {
  return [...graph.variables.values()].map((v) => v.name).sort()
}

describe('design system apply / extract', () => {
  test('creates one collection with slash-path token variables and modes', () => {
    const graph = new SceneGraph()
    const { collectionId } = applyDesignSystem(graph, DOC)
    const collection = graph.variableCollections.get(collectionId)

    expect(collection?.name).toBe('Design System')
    expect(collection?.modes.map((m) => m.name)).toEqual(['light', 'dark'])
    expect(names(graph)).toEqual([
      'colors/link',
      'colors/on-primary',
      'colors/primary',
      'colors/surface',
      'rounded/md',
      'spacing/md',
      'typography/body/font-family',
      'typography/body/font-size',
      'typography/body/line-height'
    ])
    const link = [...graph.variables.values()].find((v) => v.name === 'colors/link')
    const primary = [...graph.variables.values()].find((v) => v.name === 'colors/primary')
    expect(Object.values(link?.valuesByMode ?? {})[0]).toEqual({ aliasId: primary?.id })
  })

  test('extract → serialize reproduces tokens, keeping prose and components', () => {
    const graph = new SceneGraph()
    applyDesignSystem(graph, DOC)
    const read = readDesignSystem(graph)
    expect(read.colors).toEqual({
      primary: { light: '#533AFD', dark: '#533AFD' },
      'on-primary': { light: '#FFFFFF', dark: '#FFFFFF' },
      link: { light: '{colors.primary}', dark: '{colors.primary}' },
      surface: { light: '#FFFFFF', dark: '#09090B' }
    })
    expect(read.typography.body).toEqual({ fontFamily: 'Inter', fontSize: 16, lineHeight: 1.5 })
    expect(read.components.button.backgroundColor).toBe('{colors.primary}')
    expect(buildDesignMd(graph)).toContain('Prose that must survive.')
  })

  test('re-applying the same document is a no-op plan', () => {
    const graph = new SceneGraph()
    applyDesignSystem(graph, DOC)
    const plan = planDesignApply(graph, readDesignSystem(graph))
    expect(plan.create).toHaveLength(0)
    expect(plan.update).toHaveLength(0)
    expect(plan.remove).toHaveLength(0)
  })

  test('removes tokens dropped from DESIGN.md but leaves non-token variables alone', () => {
    const graph = new SceneGraph()
    const { collectionId } = applyDesignSystem(graph, DOC)
    graph.createVariable('logo-main', 'STRING', collectionId, 'hash')
    const trimmed = { ...DOC, spacing: {}, rounded: {} }
    const plan = planDesignApply(graph, trimmed)
    expect(plan.remove.map((r) => r.name).sort()).toEqual(['rounded/md', 'spacing/md'])
    applyDesignSystem(graph, trimmed)
    expect(names(graph)).toContain('logo-main')
    expect(names(graph)).not.toContain('spacing/md')
  })

  test('adopts legacy Style Guide variables in place instead of duplicating them', () => {
    const graph = new SceneGraph()
    const legacy = graph.createCollection('Default')
    const old = graph.createVariable('font-size-body', 'FLOAT', legacy.id, 14)
    applyDesignSystem(graph, { ...DOC, colors: {} })
    expect(graph.variables.get(old.id)?.name).toBe('typography/body/font-size')
    expect(Object.values(graph.variables.get(old.id)?.valuesByMode ?? {})).toContain(16)
    expect(names(graph).filter((n) => n.endsWith('font-size'))).toHaveLength(1)
  })

  test('reports a type conflict instead of changing the variable type', () => {
    const graph = new SceneGraph()
    const collection = graph.createCollection('Design System')
    graph.createVariable('spacing/md', 'STRING', collection.id, 'wide')
    const plan = planDesignApply(graph, DOC)
    expect(plan.conflicts).toEqual([
      { name: 'spacing/md', existingType: 'STRING', wantedType: 'FLOAT' }
    ])
  })

  test('snapshot / restore undoes an apply exactly, including unbound nodes', () => {
    const graph = new SceneGraph()
    const { collectionId } = applyDesignSystem(graph, DOC)
    const spacing = graph
      .getVariablesForCollection(collectionId)
      .find((v) => v.name === 'spacing/md')
    const frame = graph.createNode('FRAME', graph.getPages()[0].id, {})
    if (spacing) graph.bindVariable(frame.id, 'itemSpacing', spacing.id)

    const before = snapshotDesignState(graph)
    applyDesignSystem(graph, { ...DOC, spacing: {} })
    expect(graph.getNode(frame.id)?.boundVariables.itemSpacing).toBeUndefined()

    restoreDesignState(graph, before)
    expect(graph.getNode(frame.id)?.boundVariables.itemSpacing).toBe(spacing?.id)
    expect(names(graph)).toContain('spacing/md')
  })

  test('stores DESIGN.md on a marked Style Guide page found by marker after rename', () => {
    const graph = new SceneGraph()
    const page = ensureStyleGuidePage(graph)
    applyDesignSystem(graph, DOC)
    graph.updateNode(page.id, { name: 'Brand' })
    expect(findStyleGuidePage(graph)?.id).toBe(page.id)
    expect(getStoredDesignMd(graph)).toContain('Prose that must survive.')
  })

  test('exports CSS with per-mode overrides and resolved references', () => {
    const css = exportDesignTokens(DOC, 'css')
    expect(css).toContain('--color-primary: #533afd;')
    expect(css).toContain('--color-link: var(--color-primary);')
    expect(css).toContain('--font-size-body: 16px;')
    expect(css).toContain("[data-theme='dark'] {\n  --color-surface: #09090b;\n}")
    const tailwind = exportDesignTokens(DOC, 'tailwind')
    expect(tailwind).toContain('@theme {')
    expect(tailwind).toContain('--text-body: 16px;')
    const dtcg = JSON.parse(exportDesignTokens(DOC, 'dtcg'))
    expect(dtcg.color.link.$value).toBe('{color.primary}')
    expect(dtcg.spacing.md).toEqual({ $type: 'dimension', $value: '12px' })
  })
})
