import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Strokes Included / Excluded in Auto Layout', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'AutoLayoutFrame',
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      layoutMode: 'HORIZONTAL',
      strokesIncludedInLayout: false
    })

    return { editor, frame, pageId }
  }


  test('defaults strokesIncludedInLayout to false', () => {
    const { editor, frame } = setup()
    const node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.strokesIncludedInLayout).toBe(false)
  })

  test('toggles strokesIncludedInLayout with undo/redo', () => {
    const { editor, frame } = setup()

    editor.updateNodeWithUndo(
      frame.id,
      { strokesIncludedInLayout: true },
      'Include strokes in layout'
    )

    let node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.strokesIncludedInLayout).toBe(true)

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.strokesIncludedInLayout).toBe(false)

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.strokesIncludedInLayout).toBe(true)
  })
})
