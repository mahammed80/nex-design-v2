import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Text Lists & Hyperlinks', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const textNode = editor.graph.createNode('TEXT', pageId, {
      name: 'ListText',
      x: 0,
      y: 0,
      characters: 'First item\nSecond item\nThird item',
      listStyle: 'NONE',
      styleRuns: [
        {
          start: 0,
          length: 10,
          style: {
            hyperlink: 'https://nexdesign.dev'
          }
        }
      ]
    })

    return { editor, textNode, pageId }
  }

  test('applies unordered (bulleted) list style with undo', () => {
    const { editor, textNode } = setup()

    editor.updateNodeWithUndo(textNode.id, { listStyle: 'UNORDERED' }, 'Set Bulleted List')
    let node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.listStyle).toBe('UNORDERED')

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.listStyle).toBe('NONE')

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.listStyle).toBe('UNORDERED')
  })

  test('applies ordered (numbered) list style', () => {
    const { editor, textNode } = setup()

    editor.updateNodeWithUndo(textNode.id, { listStyle: 'ORDERED' }, 'Set Numbered List')
    const node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.listStyle).toBe('ORDERED')
  })

  test('preserves inline hyperlink style runs across undo and redo', () => {
    const { editor, textNode } = setup()

    let node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.styleRuns?.[0]?.style?.hyperlink).toBe('https://nexdesign.dev')

    editor.updateNodeWithUndo(
      textNode.id,
      {
        styleRuns: [
          {
            start: 0,
            length: 10,
            style: { hyperlink: 'https://github.com' }
          }
        ]
      },
      'Update Hyperlink'
    )

    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.styleRuns?.[0]?.style?.hyperlink).toBe('https://github.com')

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.styleRuns?.[0]?.style?.hyperlink).toBe('https://nexdesign.dev')
  })
})
