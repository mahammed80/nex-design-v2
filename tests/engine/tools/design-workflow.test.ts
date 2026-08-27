import { describe, expect, test } from 'bun:test'

import { designContent, designSkeleton } from '@nex-design/core/tools'

import { expectDefined } from '#tests/helpers/assert'
import { setupToolTest } from '#tests/helpers/tools'

interface SkeletonResult {
  rootId: string
  sectionIds: string[]
  sections: Array<{ id: string; label: string }>
  nextSteps: string[]
}

interface ContentResult {
  insertedCount: number
  warnings: string[]
}

describe('design workflow', () => {
  test('nests generated sections and returns their real node IDs', () => {
    const { figma } = setupToolTest()
    const result = designSkeleton.execute(figma, {
      rootFrame: JSON.stringify({ name: 'Dashboard', width: 1200, height: 800 }),
      sections: JSON.stringify([
        { id: 'logical-hero', label: 'Hero', region: { width: 100, height: 40 } },
        { id: 'logical-content', label: 'Content', region: { width: 100, height: 60 } }
      ])
    }) as SkeletonResult

    const root = expectDefined(figma.graph.getNode(result.rootId), 'workflow root')
    expect(root.childIds).toEqual(result.sectionIds)
    expect(result.sections.map((section) => section.id)).toEqual(result.sectionIds)
    expect(result.sectionIds).not.toContain('logical-hero')
    expect(result.nextSteps[0]).toContain(result.sectionIds[0])
  })

  test('creates requested node types inside the target section', () => {
    const { figma } = setupToolTest()
    const section = figma.createFrame()
    const result = designContent.execute(figma, {
      sectionId: section.id,
      children: JSON.stringify([
        { type: 'TEXT', name: 'Title', width: 300, height: 40, content: 'Hello' },
        { type: 'RECTANGLE', name: 'Image', width: 400, height: 240 },
        { type: 'UNKNOWN', name: 'Skipped' }
      ])
    }) as ContentResult

    const children = figma.graph.getChildren(section.id)
    expect(result.insertedCount).toBe(2)
    expect(result.warnings).toEqual(['Unsupported node type: UNKNOWN'])
    expect(children.map((node) => node.type)).toEqual(['TEXT', 'RECTANGLE'])
    expect(children[0].text).toBe('Hello')
  })
})
