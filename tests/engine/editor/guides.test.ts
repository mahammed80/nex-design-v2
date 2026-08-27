import { describe, expect, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile } from '@nex-design/core'
import { createEditor } from '@nex-design/core/editor'

describe('canvas guides', () => {
  test('create, move, select, hide, lock, delete, undo, and redo', () => {
    const editor = createEditor()
    const guideId = editor.addGuide('horizontal', 120)

    expect(editor.state.guides).toEqual([{ id: guideId, type: 'horizontal', value: 120 }])

    editor.setSelectedGuideId(guideId)
    editor.updateGuideValue(guideId, 240)
    editor.toggleGuidesVisible()
    editor.setGuidesLocked(true)

    expect(editor.state.selectedGuideId).toBe(guideId)
    expect(editor.state.guides[0]?.value).toBe(240)
    expect(editor.state.guidesVisible).toBe(false)
    expect(editor.state.guidesLocked).toBe(true)

    editor.removeGuide(guideId)
    expect(editor.state.guides).toEqual([])
    expect(editor.state.selectedGuideId).toBeNull()

    editor.undo.undo()
    expect(editor.state.guides).toEqual([{ id: guideId, type: 'horizontal', value: 240 }])
    expect(editor.state.selectedGuideId).toBe(guideId)

    editor.undo.redo()
    expect(editor.state.guides).toEqual([])
  })

  test('keeps guides per page and persists them through a .fig roundtrip', async () => {
    await initCodec()
    const editor = createEditor()
    const firstPageId = editor.state.currentPageId
    editor.addGuide('horizontal', 80)

    const secondPageId = editor.addPage('Second Page')
    await editor.switchPage(secondPageId)
    editor.addGuide('vertical', 160)

    await editor.switchPage(firstPageId)
    expect(editor.state.guides.map(({ type, value }) => ({ type, value }))).toEqual([
      { type: 'horizontal', value: 80 }
    ])

    const bytes = await exportFigFile(editor.graph)
    const imported = await parseFigFile(bytes.buffer as ArrayBuffer)
    const pages = imported.getPages()

    expect(pages[0]?.guides?.map(({ type, value }) => ({ type, value }))).toEqual([
      { type: 'horizontal', value: 80 }
    ])
    expect(pages[1]?.guides?.map(({ type, value }) => ({ type, value }))).toEqual([
      { type: 'vertical', value: 160 }
    ])
  })
})
