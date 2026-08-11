import { describe, expect, test } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'

describe('boolean operation editor actions', () => {
  test('creates an undoable boolean group while preserving visual positions', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const first = editor.graph.createNode('RECTANGLE', pageId, {
      x: 20,
      y: 30,
      width: 40,
      height: 50
    })
    const second = editor.graph.createNode('ELLIPSE', pageId, {
      x: 80,
      y: 70,
      width: 60,
      height: 40
    })
    editor.select([first.id, second.id])

    const groupId = editor.createBooleanOperation('INTERSECT')
    const group = groupId ? editor.graph.getNode(groupId) : undefined

    expect(group?.type).toBe('BOOLEAN_OPERATION')
    expect(group?.booleanOperation).toBe('INTERSECT')
    expect(group?.childIds).toEqual([first.id, second.id])
    expect(editor.graph.getAbsolutePosition(first.id)).toEqual({ x: 20, y: 30 })
    expect(editor.graph.getAbsolutePosition(second.id)).toEqual({ x: 80, y: 70 })

    editor.undo.undo()
    expect(editor.graph.getNode(groupId ?? '')).toBeUndefined()
    expect(editor.graph.getNode(first.id)?.parentId).toBe(pageId)
    expect(editor.graph.getAbsolutePosition(first.id)).toEqual({ x: 20, y: 30 })

    editor.undo.redo()
    expect(editor.graph.getNode(groupId ?? '')?.booleanOperation).toBe('INTERSECT')
    expect(editor.graph.getNode(first.id)?.parentId).toBe(groupId)
  })

  test('updates the operation with undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const group = editor.graph.createNode('BOOLEAN_OPERATION', pageId, {
      booleanOperation: 'UNION'
    })

    editor.updateNodeWithUndo(
      group.id,
      { booleanOperation: 'EXCLUDE', name: 'Boolean exclude' },
      'Change boolean operation'
    )
    expect(editor.graph.getNode(group.id)?.booleanOperation).toBe('EXCLUDE')

    editor.undo.undo()
    expect(editor.graph.getNode(group.id)?.booleanOperation).toBe('UNION')
  })
})
