import { afterEach, describe, expect, test } from 'bun:test'

import { SceneGraph } from '@nex-design/core/scene-graph'
import { auditDesign } from '@nex-design/core/tools'

import { designFingerprint } from '@/app/ai/memory/storage'
import {
  clearReferenceAuthorizations,
  authorizeReferencesFromRequest,
  isReferenceAuthorized
} from '@/app/ai/reference/authorization'
import { parseDesignMarkdown, serializeDesignMarkdown } from '@/app/design-system/design-markdown'

afterEach(() => clearReferenceAuthorizations())

describe('DESIGN.md codec', () => {
  test('parses portable color, typography, spacing, and principles', () => {
    const parsed = parseDesignMarkdown(
      `# Acme\n\n## Direction\n- Editorial and dense\n\n## Colors\n- \`color-brand\`: \`#123456\`\n\n## Typography\n- \`font-family-body\`: \`Inter\`\n- \`font-size-body\`: \`16\`\n\n## Spacing\n- \`spacing-md\`: \`16\`\n\n## Principles\n- Prefer sharp hierarchy`
    )

    expect(parsed.name).toBe('Acme')
    expect(parsed.colors['color-brand']).toBe('#123456')
    expect(parsed.typography['font-size-body']).toBe(16)
    expect(parsed.spacing['spacing-md']).toBe(16)
    expect(parsed.principles).toEqual(['Prefer sharp hierarchy'])
  })

  test('exports graph variables', () => {
    const graph = new SceneGraph()
    graph.addCollection({
      id: 'tokens',
      name: 'Tokens',
      modes: [{ modeId: 'default', name: 'Default' }],
      defaultModeId: 'default',
      variableIds: []
    })
    graph.addVariable({
      id: 'brand',
      name: 'color-brand',
      type: 'COLOR',
      collectionId: 'tokens',
      valuesByMode: { default: { r: 1, g: 0, b: 0, a: 1 } },
      description: '',
      hiddenFromPublishing: false
    })
    const markdown = serializeDesignMarkdown({ graph, state: { documentName: 'Product' } } as never)
    expect(markdown).toContain('# Product')
    expect(markdown).toContain('`color-brand`: `#FF0000`')
  })
})

describe('design audit and memory', () => {
  test('reports excessive radius variation and produces a stable fingerprint', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const root = graph.createNode('FRAME', page.id, { name: 'Root', width: 800, height: 600 })
    for (let radius = 1; radius <= 6; radius++) {
      graph.createNode('FRAME', root.id, {
        name: `Card ${radius}`,
        width: 100,
        height: 100,
        cornerRadius: radius
      })
    }
    expect(auditDesign(graph, root).some((finding) => finding.category === 'consistency')).toBe(
      true
    )
    expect(designFingerprint(graph, page.id)).toContain('FRAME:40x30:6')
  })
})

describe('reference authorization', () => {
  test('requires an explicit permission statement for the URL origin', () => {
    const url = new URL('https://example.com/inspiration')
    authorizeReferencesFromRequest('Study https://example.com/inspiration')
    expect(isReferenceAuthorized(url)).toBe(false)
    authorizeReferencesFromRequest('I own https://example.com/inspiration and authorize this study')
    expect(isReferenceAuthorized(url)).toBe(true)
  })
})
