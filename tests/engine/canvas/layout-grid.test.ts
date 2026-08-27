import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'
import type { LayoutGrid } from '@nex-design/core/scene-graph'

describe('Frame Layout Grids', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'GridFrame',
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
      layoutGrids: [
        {
          pattern: 'COLUMNS',
          count: 12,
          gutterSize: 24,
          offset: 48,
          alignment: 'STRETCH',
          sectionSize: 0,
          visible: true,
          color: { r: 1, g: 0, b: 0, a: 0.1 }
        },
        {
          pattern: 'ROWS',
          count: 8,
          gutterSize: 16,
          offset: 32,
          alignment: 'STRETCH',
          sectionSize: 0,
          visible: true,
          color: { r: 0, g: 0, b: 1, a: 0.1 }
        },
        {
          pattern: 'GRID',
          sectionSize: 8,
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.05 }
        }
      ]
    })

    return { editor, frame, pageId }
  }

  test('creates frame with layout grids', () => {
    const { editor, frame } = setup()
    const node = getNodeOrThrow(editor.graph, frame.id)

    expect(node.layoutGrids?.length).toBe(3)
    expect(node.layoutGrids?.[0]?.pattern).toBe('COLUMNS')
    expect(node.layoutGrids?.[0]?.count).toBe(12)
    expect(node.layoutGrids?.[1]?.pattern).toBe('ROWS')
    expect(node.layoutGrids?.[2]?.pattern).toBe('GRID')
    expect(node.layoutGrids?.[2]?.sectionSize).toBe(8)
  })

  test('updates and toggles layout grid visibility with undo', () => {
    const { editor, frame } = setup()

    const updatedGrids: LayoutGrid[] = [
      {
        pattern: 'COLUMNS',
        count: 6,
        gutterSize: 16,
        offset: 20,
        alignment: 'CENTER',
        sectionSize: 80,
        visible: false,
        color: { r: 0, g: 1, b: 0, a: 0.2 }
      }
    ]

    editor.updateNodeWithUndo(frame.id, { layoutGrids: updatedGrids }, 'Update layout grids')

    let node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.layoutGrids?.length).toBe(1)
    expect(node.layoutGrids?.[0]?.visible).toBe(false)
    expect(node.layoutGrids?.[0]?.count).toBe(6)

    editor.undo.undo()
    node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.layoutGrids?.length).toBe(3)
    expect(node.layoutGrids?.[0]?.count).toBe(12)

    editor.undo.redo()
    node = getNodeOrThrow(editor.graph, frame.id)
    expect(node.layoutGrids?.length).toBe(1)
  })
})
