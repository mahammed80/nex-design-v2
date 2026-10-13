import { describe, expect, test } from 'bun:test'

import { applyDesignSystem, parseDesignMd } from '@nex-design/core/design-system'
import { createLinter } from '@nex-design/core/lint'
import { SceneGraph } from '@nex-design/core/scene-graph'

const DOC = parseDesignMd(
  [
    '---',
    'colors:',
    '  primary: "#533afd"',
    'spacing:',
    '  md: 12px',
    'rounded:',
    '  lg: 16px',
    '---'
  ].join('\n')
).doc

function setup() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Card',
    layoutMode: 'VERTICAL',
    itemSpacing: 12,
    cornerRadius: 16,
    fills: [
      {
        type: 'SOLID',
        color: { r: 0x53 / 255, g: 0x3a / 255, b: 0xfd / 255, a: 1 },
        opacity: 1,
        visible: true
      }
    ]
  })
  return { graph, frame }
}

function tokenMessages(graph: SceneGraph) {
  return createLinter({
    rules: ['token-compliance'],
    config: { rules: { 'token-compliance': 'info' } }
  })
    .lintGraph(graph)
    .messages.map((m) => m.message)
}

describe('token-compliance lint rule', () => {
  test('reports raw values that equal a token', () => {
    const { graph } = setup()
    applyDesignSystem(graph, DOC)
    const messages = tokenMessages(graph)
    expect(messages.some((m) => m.includes('colors.primary'))).toBe(true)
    expect(messages.some((m) => m.includes('spacing.md'))).toBe(true)
    expect(messages.some((m) => m.includes('rounded.lg'))).toBe(true)
  })

  test('stays quiet for bound values and documents without tokens', () => {
    const { graph, frame } = setup()
    expect(tokenMessages(graph)).toEqual([])

    applyDesignSystem(graph, DOC)
    const byName = (name: string) =>
      [...graph.variables.values()].find((v) => v.name === name)?.id ?? ''
    graph.bindVariable(frame.id, 'fills/0/color', byName('colors/primary'))
    graph.bindVariable(frame.id, 'itemSpacing', byName('spacing/md'))
    graph.bindVariable(frame.id, 'cornerRadius', byName('rounded/lg'))
    expect(tokenMessages(graph)).toEqual([])
  })
})
