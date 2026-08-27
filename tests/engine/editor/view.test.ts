import { describe, expect, test } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'

describe('editor view modes', () => {
  test('toggles layer outlines and requests a render', () => {
    const editor = createEditor()
    const initialVersion = editor.state.renderVersion

    expect(editor.state.outlineMode).toBe(false)
    editor.toggleOutlineMode()
    expect(editor.state.outlineMode).toBe(true)
    expect(editor.state.renderVersion).toBe(initialVersion + 1)

    editor.toggleOutlineMode(false)
    expect(editor.state.outlineMode).toBe(false)
    expect(editor.state.renderVersion).toBe(initialVersion + 2)
  })
})
