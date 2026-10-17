import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'

describe('Identify Matching Objects / Select Similar Layers', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const rect1 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Card',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const rect2 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Card',
      x: 120,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const rect3 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Button',
      x: 240,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    const text = editor.graph.createNode('TEXT', pageId, {
      name: 'Title',
      x: 0,
      y: 120,
      characters: 'Title text'
    })

    return { editor, rect1, rect2, rect3, text, pageId }
  }

  test('selects all layers matching node type', () => {
    const { editor, rect1 } = setup()

    editor.select([rect1.id])
    const matches = editor.selectAllMatchingType()

    expect(matches.length).toBe(3)
    expect(editor.state.selectedIds.size).toBe(3)
  })

  test('selects all layers matching fill color', () => {
    const { editor, rect1, rect2, rect3 } = setup()

    editor.select([rect1.id])
    const matches = editor.selectAllMatchingFill()

    expect(matches.length).toBe(2)
    expect(matches).toContain(rect1.id)
    expect(matches).toContain(rect2.id)
    expect(matches).not.toContain(rect3.id)
  })

  test('selects all layers matching layer name', () => {
    const { editor, rect1, rect2 } = setup()

    editor.select([rect1.id])
    const matches = editor.selectSimilar('NAME')

    expect(matches.length).toBe(2)
    expect(matches).toContain(rect1.id)
    expect(matches).toContain(rect2.id)
  })
})
