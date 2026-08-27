import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('copyProperties and pasteProperties', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const source = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Source',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.8, visible: true }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }],
      strokeWeight: 4,
      strokeAlign: 'INSIDE',
      strokeCap: 'ROUND',
      strokeJoin: 'ROUND',
      cornerRadius: 12,
      opacity: 0.9,
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 2, y: 4 },
          radius: 8,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    })

    const target1 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Target1',
      x: 150,
      y: 0,
      width: 80,
      height: 80,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const target2 = editor.graph.createNode('ELLIPSE', pageId, {
      name: 'Target2',
      x: 250,
      y: 0,
      width: 60,
      height: 60
    })

    return { editor, source, target1, target2, pageId }
  }

  test('copies styling properties and pastes to selected nodes', () => {
    const { editor, source, target1, target2 } = setup()

    editor.select([source.id])
    const copyOk = editor.copyProperties()
    expect(copyOk).toBe(true)

    editor.select([target1.id, target2.id])
    const pasteOk = editor.pasteProperties()
    expect(pasteOk).toBe(true)

    const updated1 = getNodeOrThrow(editor.graph, target1.id)
    const updated2 = getNodeOrThrow(editor.graph, target2.id)

    expect(updated1.fills?.[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(updated1.fills?.[0]?.opacity).toBe(0.8)
    expect(updated1.strokeWeight).toBe(4)
    expect(updated1.strokeAlign).toBe('INSIDE')
    expect(updated1.strokeCap).toBe('ROUND')
    expect(updated1.cornerRadius).toBe(12)
    expect(updated1.opacity).toBe(0.9)
    expect(updated1.effects?.length).toBe(1)
    expect(updated1.effects?.[0]?.type).toBe('DROP_SHADOW')

    expect(updated2.fills?.[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(updated2.strokeWeight).toBe(4)
    expect(updated2.opacity).toBe(0.9)
  })

  test('paste properties is undoable and redoable', () => {
    const { editor, source, target1 } = setup()

    editor.select([source.id])
    editor.copyProperties()

    editor.select([target1.id])
    editor.pasteProperties()

    expect(getNodeOrThrow(editor.graph, target1.id).strokeWeight).toBe(4)
    expect(editor.undo.canUndo).toBe(true)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, target1.id).strokeWeight).toBeUndefined()
    expect(getNodeOrThrow(editor.graph, target1.id).fills?.[0]?.color).toEqual({ r: 0, g: 1, b: 0, a: 1 })

    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, target1.id).strokeWeight).toBe(4)
    expect(getNodeOrThrow(editor.graph, target1.id).fills?.[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('copies and pastes typography properties between text nodes', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const textSource = editor.graph.createNode('TEXT', pageId, {
      name: 'SourceText',
      x: 0,
      y: 0,
      fontFamily: 'Roboto',
      fontSize: 24,
      fontWeight: 700,
      italic: true,
      textAlignHorizontal: 'CENTER',
      textDecoration: 'UNDERLINE'
    })

    const textTarget = editor.graph.createNode('TEXT', pageId, {
      name: 'TargetText',
      x: 100,
      y: 0,
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 400
    })

    editor.select([textSource.id])
    editor.copyProperties()

    editor.select([textTarget.id])
    editor.pasteProperties()

    const updated = getNodeOrThrow(editor.graph, textTarget.id)
    expect(updated.fontFamily).toBe('Roboto')
    expect(updated.fontSize).toBe(24)
    expect(updated.fontWeight).toBe(700)
    expect(updated.italic).toBe(true)
    expect(updated.textAlignHorizontal).toBe('CENTER')
    expect(updated.textDecoration).toBe('UNDERLINE')
  })
})
