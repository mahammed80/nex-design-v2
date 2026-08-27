import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Eyedropper Tool & Color Sampling', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const source = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'SourceCard',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0, a: 1 }, opacity: 1, visible: true }]
    })


    const target = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'TargetCard',
      x: 150,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    return { editor, source, target, pageId }
  }

  test('switches active tool to EYEROPPER via shortcut I', () => {
    const { editor } = setup()

    editor.setTool('EYEROPPER')
    expect(editor.state.activeTool).toBe('EYEROPPER')
  })


  test('applies sampled color to selected node fill with undo/redo', () => {
    const { editor, target } = setup()

    editor.select([target.id])
    const sampledColor = { r: 0.2, g: 0.8, b: 0.5, a: 1 }

    editor.applyColorToSelected(sampledColor, 'FILL')

    let node = getNodeOrThrow(editor.graph, target.id)
    expect(node.fills[0].color).toEqual(sampledColor)

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, target.id)
    expect(node.fills[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 })

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, target.id)
    expect(node.fills[0].color).toEqual(sampledColor)
  })

  test('applies sampled color to selected node stroke', () => {
    const { editor, target } = setup()

    editor.select([target.id])
    const sampledColor = { r: 1, g: 0, b: 1, a: 1 }

    editor.applyColorToSelected(sampledColor, 'STROKE')

    const node = getNodeOrThrow(editor.graph, target.id)
    expect(node.strokes[0].color).toEqual(sampledColor)
  })
})
