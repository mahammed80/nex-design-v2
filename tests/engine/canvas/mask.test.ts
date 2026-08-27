import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Shape & Alpha Masks', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'CardFrame',
      x: 0,
      y: 0,
      width: 400,
      height: 400
    })

    const maskRect = editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'MaskShape',
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      cornerRadius: 24,
      isMask: false
    })

    const photo = editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'TargetPhoto',
      x: 0,
      y: 0,
      width: 300,
      height: 300
    })

    return { editor, frame, maskRect, photo, pageId }
  }

  test('toggles layer isMask property with undo and redo', () => {
    const { editor, maskRect } = setup()

    editor.select([maskRect.id])
    editor.toggleMaskSelected()

    let node = getNodeOrThrow(editor.graph, maskRect.id)
    expect(node.isMask).toBe(true)

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, maskRect.id)
    expect(node.isMask).toBe(false)

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, maskRect.id)
    expect(node.isMask).toBe(true)
  })

  test('masked node persists properties in frame hierarchy', () => {
    const { editor, frame, maskRect } = setup()

    editor.select([maskRect.id])
    editor.toggleMaskSelected()

    const frameNode = getNodeOrThrow(editor.graph, frame.id)
    expect(frameNode.childIds.length).toBe(2)

    const maskChild = getNodeOrThrow(editor.graph, frameNode.childIds[0])
    expect(maskChild.isMask).toBe(true)
  })
})
