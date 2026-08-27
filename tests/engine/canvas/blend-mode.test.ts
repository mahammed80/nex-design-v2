import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'
import { toCanvasKitBlendMode } from '@nex-design/core/canvas/blend-mode'
import type { CanvasKit } from 'canvaskit-wasm'

describe('Blend Modes (Layer & Fills)', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const node = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'BlendRect',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      blendMode: 'PASS_THROUGH',
      opacity: 0.9
    })

    return { editor, node, pageId }
  }

  test('converts Figma blend mode strings to CanvasKit blend modes', () => {
    // Mock CanvasKit BlendMode enum
    const mockCk = {
      BlendMode: {
        SrcOver: { value: 0 },
        Multiply: { value: 1 },
        Screen: { value: 2 },
        Overlay: { value: 3 },
        Darken: { value: 4 },
        Lighten: { value: 5 },
        ColorDodge: { value: 6 },
        ColorBurn: { value: 7 },
        HardLight: { value: 8 },
        SoftLight: { value: 9 },
        Difference: { value: 10 },
        Exclusion: { value: 11 },
        Hue: { value: 12 },
        Saturation: { value: 13 },
        Color: { value: 14 },
        Luminosity: { value: 15 }
      }
    } as unknown as CanvasKit

    expect(toCanvasKitBlendMode(mockCk, 'PASS_THROUGH')).toBe(mockCk.BlendMode.SrcOver)
    expect(toCanvasKitBlendMode(mockCk, 'MULTIPLY')).toBe(mockCk.BlendMode.Multiply)
    expect(toCanvasKitBlendMode(mockCk, 'SCREEN')).toBe(mockCk.BlendMode.Screen)
    expect(toCanvasKitBlendMode(mockCk, 'OVERLAY')).toBe(mockCk.BlendMode.Overlay)
    expect(toCanvasKitBlendMode(mockCk, 'LUMINOSITY')).toBe(mockCk.BlendMode.Luminosity)
  })

  test('updates node blendMode with undo and redo', () => {
    const { editor, node } = setup()

    editor.updateNodeWithUndo(node.id, { blendMode: 'MULTIPLY' }, 'Set Multiply Blend Mode')
    let current = getNodeOrThrow(editor.graph, node.id)
    expect(current.blendMode).toBe('MULTIPLY')

    editor.updateNodeWithUndo(node.id, { blendMode: 'SCREEN' }, 'Set Screen Blend Mode')
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.blendMode).toBe('SCREEN')

    editor.undo.undo()
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.blendMode).toBe('MULTIPLY')

    editor.undo.undo()
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.blendMode).toBe('PASS_THROUGH')

    editor.undo.redo()
    current = getNodeOrThrow(editor.graph, node.id)
    expect(current.blendMode).toBe('MULTIPLY')
  })
})
