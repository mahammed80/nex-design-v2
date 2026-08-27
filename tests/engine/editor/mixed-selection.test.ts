import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'

describe('Mixed Selection Color Editing', () => {
  test('setFillColorForSelection applies color to all selected nodes', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const r1 = editor.graph.createNode('RECTANGLE', pageId, { name: 'A', x: 0, y: 0, width: 100, height: 100, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }] })
    const r2 = editor.graph.createNode('RECTANGLE', pageId, { name: 'B', x: 200, y: 0, width: 100, height: 100, fills: [] })
    editor.select([r1.id, r2.id])
    editor.setFillColorForSelection({ r: 0, g: 0, b: 1, a: 1 })
    expect(editor.graph.getNode(r1.id)?.fills[0].color.b).toBe(1)
    expect(editor.graph.getNode(r2.id)?.fills[0].type).toBe('SOLID')
  })
})

describe('Image Property Adjustment', () => {
  test('applies filters to image fill', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const node = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Img', x: 0, y: 0, width: 100, height: 100,
      fills: [{ type: 'IMAGE', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true, imageHash: 'test', imageScaleMode: 'FILL' }]
    })
    editor.select([node.id])
    editor.applyImageFiltersToSelected({ exposure: 0.2, saturation: 0.3 })
    const fill = editor.graph.getNode(node.id)?.fills[0]
    expect(fill?.filters?.exposure).toBe(0.2)
    expect(fill?.filters?.saturation).toBe(0.3)
  })
})

describe('OpenType Features & Variable Font Axes', () => {
  test('applyOpenTypeFeaturesSelected sets ligatures', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const node = editor.graph.createNode('TEXT', pageId, { name: 'T', x: 0, y: 0, width: 200, height: 50, text: 'fi fl' })
    editor.select([node.id])
    editor.applyOpenTypeFeaturesSelected({ liga: true, tnum: true })
    const otf = editor.graph.getNode(node.id)?.openTypeFeatures
    expect(otf?.liga).toBe(true)
    expect(otf?.tnum).toBe(true)
  })

  test('applyVariableFontAxesSelected sets wght axis', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const node = editor.graph.createNode('TEXT', pageId, { name: 'T', x: 0, y: 0, width: 200, height: 50, text: 'Hello' })
    editor.select([node.id])
    editor.applyVariableFontAxesSelected({ wght: 550, wdth: 125 })
    const otf = editor.graph.getNode(node.id)?.openTypeFeatures
    expect(otf?.wght).toBe(550)
    expect(otf?.wdth).toBe(125)
  })
})
