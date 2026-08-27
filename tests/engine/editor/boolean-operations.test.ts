import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Boolean Operations (Union, Subtract, Intersect, Exclude)', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const circle1 = editor.graph.createNode('ELLIPSE', pageId, {
      name: 'Circle 1',
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })

    const circle2 = editor.graph.createNode('ELLIPSE', pageId, {
      name: 'Circle 2',
      x: 50,
      y: 0,
      width: 100,
      height: 100
    })

    return { editor, circle1, circle2, pageId }
  }

  test('creates boolean union container with selected shapes', () => {
    const { editor, circle1, circle2 } = setup()

    editor.select([circle1.id, circle2.id])
    const boolId = editor.booleanUnionSelected()

    expect(boolId).toBeTruthy()
    const boolNode = getNodeOrThrow(editor.graph, boolId!)
    expect(boolNode.type).toBe('BOOLEAN_OPERATION')
    expect(boolNode.booleanOperation).toBe('UNION')
    expect(boolNode.childIds.length).toBe(2)

    editor.undo.undo()
    expect(editor.graph.getNode(boolId!)).toBeUndefined()
    expect(editor.graph.getNode(circle1.id)).toBeDefined()

    editor.undo.redo()
    expect(editor.graph.getNode(boolId!)).toBeDefined()
    expect(getNodeOrThrow(editor.graph, boolId!).booleanOperation).toBe('UNION')
  })

  test('creates boolean subtract, intersect, and exclude containers', () => {
    const { editor, circle1, circle2 } = setup()

    editor.select([circle1.id, circle2.id])
    const subId = editor.booleanSubtractSelected()
    expect(subId).toBeTruthy()
    expect(getNodeOrThrow(editor.graph, subId!).booleanOperation).toBe('SUBTRACT')
    editor.undo.undo()

    editor.select([circle1.id, circle2.id])
    const intId = editor.booleanIntersectSelected()
    expect(intId).toBeTruthy()
    expect(getNodeOrThrow(editor.graph, intId!).booleanOperation).toBe('INTERSECT')
    editor.undo.undo()

    editor.select([circle1.id, circle2.id])
    const excId = editor.booleanExcludeSelected()
    expect(excId).toBeTruthy()
    expect(getNodeOrThrow(editor.graph, excId!).booleanOperation).toBe('EXCLUDE')
  })
})
