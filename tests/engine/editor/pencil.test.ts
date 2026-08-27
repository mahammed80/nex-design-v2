import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Pencil (Freehand) Tool', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    return { editor, pageId }
  }

  test('creates smooth freehand pencil vector stroke from points', () => {
    const { editor, pageId } = setup()

    const points = [
      { x: 10, y: 10 },
      { x: 20, y: 15 },
      { x: 35, y: 30 },
      { x: 60, y: 50 },
      { x: 100, y: 80 }
    ]

    const nodeId = editor.createFreehandPencilStroke(points, pageId)
    expect(nodeId).toBeTruthy()

    const node = getNodeOrThrow(editor.graph, nodeId!)
    expect(node.type).toBe('VECTOR')
    expect(node.name).toBe('Pencil')
    expect(node.strokeCap).toBe('ROUND')
    expect(node.strokeJoin).toBe('ROUND')
    expect(node.vectorNetwork?.vertices.length).toBe(5)
    expect(node.vectorNetwork?.segments.length).toBe(4)
    expect(node.width).toBe(90) // 100 - 10
    expect(node.height).toBe(70) // 80 - 10
  })

  test('sets active tool to PENCIL', () => {
    const { editor } = setup()

    editor.setTool('PENCIL')
    expect(editor.state.activeTool).toBe('PENCIL')

    editor.setTool('SELECT')
    expect(editor.state.activeTool).toBe('SELECT')
  })
})
