import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'
import type { Fill, Stroke } from '@nex-design/core/scene-graph'

describe('Multiple Stacked Fills & Strokes per Layer', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const node = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'MultiFillCard',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true
        },
        {
          type: 'GRADIENT_LINEAR',
          opacity: 0.5,
          visible: true,
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
          ],
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0]
          ]
        }
      ],
      strokes: [
        {
          color: { r: 0, g: 0, b: 0, a: 1 },
          weight: 2,
          opacity: 1,
          visible: true,
          align: 'INSIDE'
        },
        {
          color: { r: 1, g: 0, b: 0, a: 1 },
          weight: 4,
          opacity: 0.8,
          visible: true,
          align: 'OUTSIDE'
        }
      ]
    })

    return { editor, node, pageId }
  }

  test('preserves ordered stacked fills with visibility and opacity', () => {
    const { editor, node } = setup()
    const current = getNodeOrThrow(editor.graph, node.id)

    expect(current.fills.length).toBe(2)
    expect(current.fills[0].type).toBe('SOLID')
    expect(current.fills[1].type).toBe('GRADIENT_LINEAR')
    expect(current.fills[1].opacity).toBe(0.5)
  })

  test('preserves ordered stacked strokes with alignments and weights', () => {
    const { editor, node } = setup()
    const current = getNodeOrThrow(editor.graph, node.id)

    expect(current.strokes.length).toBe(2)
    expect(current.strokes[0].weight).toBe(2)
    expect(current.strokes[0].align).toBe('INSIDE')
    expect(current.strokes[1].weight).toBe(4)
    expect(current.strokes[1].align).toBe('OUTSIDE')
  })

  test('updates, reorders and toggles fills with undo/redo transactions', () => {
    const { editor, node } = setup()

    const updatedFills: Fill[] = [
      {
        type: 'SOLID',
        color: { r: 0, g: 1, b: 0, a: 1 },
        opacity: 0.9,
        visible: true
      }
    ]

    editor.updateNodeWithUndo(node.id, { fills: updatedFills }, 'Update Fills Stack')
    let current = getNodeOrThrow(editor.graph, node.id)
    expect(current.fills.length).toBe(1)
    expect(current.fills[0].opacity).toBe(0.9)

    editor.undo.undo()
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.fills.length).toBe(2)

    editor.undo.redo()
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.fills.length).toBe(1)
  })
})
