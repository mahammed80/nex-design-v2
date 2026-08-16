import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'

import { resolveResizeModeChanges } from '#vue/shared/input/resize/mode'

describe('resolveResizeModeChanges', () => {
  test('switches Auto Layout frame primaryAxisSizing from HUG to FIXED when dragging handle', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'Button',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      x: 100,
      y: 100,
      width: 200,
      height: 40
    })

    const changesE = resolveResizeModeChanges(frame, 'e', editor.graph)
    expect(changesE.primaryAxisSizing).toBe('FIXED')
    expect(changesE.counterAxisSizing).toBeUndefined()

    const changesS = resolveResizeModeChanges(frame, 's', editor.graph)
    expect(changesS.counterAxisSizing).toBe('FIXED')
    expect(changesS.primaryAxisSizing).toBeUndefined()

    const changesSE = resolveResizeModeChanges(frame, 'se', editor.graph)
    expect(changesSE.primaryAxisSizing).toBe('FIXED')
    expect(changesSE.counterAxisSizing).toBe('FIXED')
  })

  test('switches textAutoResize from WIDTH_AND_HEIGHT to HEIGHT when dragging horizontal handle', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const textNode = editor.graph.createNode('TEXT', pageId, {
      name: 'Text',
      textAutoResize: 'WIDTH_AND_HEIGHT',
      characters: 'Nexus Design Studios',
      x: 10,
      y: 10,
      width: 200,
      height: 20
    })

    const changesE = resolveResizeModeChanges(textNode, 'e', editor.graph)
    expect(changesE.textAutoResize).toBe('HEIGHT')

    const changesSE = resolveResizeModeChanges(textNode, 'se', editor.graph)
    expect(changesSE.textAutoResize).toBe('NONE')

    const changesS = resolveResizeModeChanges(textNode, 's', editor.graph)
    expect(changesS.textAutoResize).toBe('NONE')
  })

  test('resets layoutAlign STRETCH and layoutGrow 1 on Auto Layout child when resized', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const parent = editor.graph.createNode('FRAME', pageId, {
      name: 'ParentFrame',
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      width: 500,
      height: 200
    })
    const child = editor.graph.createNode('FRAME', parent.id, {
      name: 'ChildFrame',
      layoutAlign: 'STRETCH',
      layoutGrow: 1,
      width: 250,
      height: 200
    })

    const changes = resolveResizeModeChanges(child, 'e', editor.graph)
    expect(changes.layoutAlign).toBe('INHERIT')
    expect(changes.layoutGrow).toBe(0)
  })
})
