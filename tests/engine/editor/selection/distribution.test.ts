import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Smart Selection Spacing & Alignment', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const r1 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'R1',
      x: 0,
      y: 0,
      width: 50,
      height: 50
    })

    const r2 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'R2',
      x: 100,
      y: 0,
      width: 50,
      height: 50
    })

    const r3 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'R3',
      x: 300,
      y: 0,
      width: 50,
      height: 50
    })

    return { editor, r1, r2, r3, pageId }
  }

  test('distributes horizontal spacing evenly across 3 nodes', () => {
    const { editor, r1, r2, r3 } = setup()

    editor.select([r1.id, r2.id, r3.id])
    const ok = editor.distributeSpacing('HORIZONTAL')
    expect(ok).toBe(true)

    const n1 = getNodeOrThrow(editor.graph, r1.id)
    const n2 = getNodeOrThrow(editor.graph, r2.id)
    const n3 = getNodeOrThrow(editor.graph, r3.id)

    expect(n1.x).toBe(0)
    expect(n2.x).toBe(150) // Total span = 350, total width = 150, gap = 100 -> x = 0 + 50 + 100 = 150
    expect(n3.x).toBe(300)
  })

  test('distributes vertical spacing evenly across 3 nodes', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const r1 = editor.graph.createNode('RECTANGLE', pageId, { x: 0, y: 0, width: 40, height: 40 })
    const r2 = editor.graph.createNode('RECTANGLE', pageId, { x: 0, y: 100, width: 40, height: 40 })
    const r3 = editor.graph.createNode('RECTANGLE', pageId, { x: 0, y: 200, width: 40, height: 40 })

    editor.select([r1.id, r2.id, r3.id])
    const ok = editor.distributeSpacing('VERTICAL')
    expect(ok).toBe(true)

    const n1 = getNodeOrThrow(editor.graph, r1.id)
    const n2 = getNodeOrThrow(editor.graph, r2.id)
    const n3 = getNodeOrThrow(editor.graph, r3.id)

    expect(n1.y).toBe(0)
    expect(n2.y).toBe(100)
    expect(n3.y).toBe(200)
  })

  test('aligns multiple nodes to top edge with undo/redo', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const r1 = editor.graph.createNode('RECTANGLE', pageId, { x: 0, y: 20, width: 50, height: 50 })
    const r2 = editor.graph.createNode('RECTANGLE', pageId, { x: 100, y: 80, width: 50, height: 50 })

    editor.select([r1.id, r2.id])
    editor.alignSelected('TOP')

    expect(getNodeOrThrow(editor.graph, r1.id).y).toBe(20)
    expect(getNodeOrThrow(editor.graph, r2.id).y).toBe(20)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, r2.id).y).toBe(80)

    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, r2.id).y).toBe(20)
  })

  test('tidy up spaces multi-selection', () => {
    const { editor, r1, r2, r3 } = setup()

    editor.select([r1.id, r2.id, r3.id])
    const ok = editor.tidyUp()
    expect(ok).toBe(true)

    expect(getNodeOrThrow(editor.graph, r2.id).x).toBe(150)
  })
})
