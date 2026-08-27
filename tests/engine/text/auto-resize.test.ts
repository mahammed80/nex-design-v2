import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Text Resizing Modes & Vertical Alignment', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const textNode = editor.graph.createNode('TEXT', pageId, {
      name: 'SampleText',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      characters: 'Hello NexDesign Design System',
      textAutoResize: 'WIDTH_AND_HEIGHT',
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'CENTER'
    })

    return { editor, textNode, pageId }
  }

  test('sets textAutoResize to WIDTH_AND_HEIGHT (Auto-Width)', () => {
    const { editor, textNode } = setup()
    const node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('WIDTH_AND_HEIGHT')
    expect(node.textAlignVertical).toBe('CENTER')
  })

  test('switches textAutoResize between modes with undo/redo', () => {
    const { editor, textNode } = setup()

    editor.updateNodeWithUndo(textNode.id, { textAutoResize: 'HEIGHT' }, 'Set Auto-Height')
    let node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('HEIGHT')

    editor.updateNodeWithUndo(textNode.id, { textAutoResize: 'NONE', textTruncation: 'ENDING' }, 'Set Fixed Size')
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('NONE')
    expect(node.textTruncation).toBe('ENDING')

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('HEIGHT')

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('WIDTH_AND_HEIGHT')

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAutoResize).toBe('HEIGHT')
  })

  test('updates vertical text alignment (TOP, CENTER, BOTTOM)', () => {
    const { editor, textNode } = setup()

    editor.updateNodeWithUndo(textNode.id, { textAlignVertical: 'BOTTOM' }, 'Align Bottom')
    let node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAlignVertical).toBe('BOTTOM')

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, textNode.id)
    expect(node.textAlignVertical).toBe('CENTER')
  })
})
