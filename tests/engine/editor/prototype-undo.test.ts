import { describe, expect, test } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const home = editor.graph.createNode('FRAME', pageId, { name: 'Home', width: 100, height: 100 })
  const details = editor.graph.createNode('FRAME', pageId, { name: 'Details', x: 200 })
  return { editor, pageId, home, details }
}

function connectionCount(editor: ReturnType<typeof createEditor>, pageId: string): number {
  return editor.graph.getNode(pageId)?.prototypeConnections?.length ?? 0
}

describe('prototype reaction undo', () => {
  test('addReaction is undoable and keeps connections in sync', () => {
    const { editor, pageId, home, details } = setup()
    editor.addReaction(home.id, {
      trigger: { type: 'ON_CLICK' },
      actions: [{ type: 'NAVIGATE', destinationId: details.id }]
    })
    expect(editor.graph.getNode(home.id)?.reactions).toHaveLength(1)
    expect(connectionCount(editor, pageId)).toBe(1)

    editor.undo.undo()
    expect(editor.graph.getNode(home.id)?.reactions ?? []).toHaveLength(0)
    expect(connectionCount(editor, pageId)).toBe(0)

    editor.undo.redo()
    expect(editor.graph.getNode(home.id)?.reactions).toHaveLength(1)
    expect(connectionCount(editor, pageId)).toBe(1)
  })

  test('updateReaction keeps fields it was not given and is undoable', () => {
    const { editor, home, details } = setup()
    editor.addReaction(home.id, {
      trigger: { type: 'ON_DRAG', direction: 'up' },
      actions: [{ type: 'NAVIGATE', destinationId: details.id }]
    })
    editor.updateReaction(home.id, 0, {
      actions: [
        {
          type: 'NAVIGATE',
          destinationId: details.id,
          transition: { type: 'DISSOLVE', duration: 200, easing: 'LINEAR' }
        }
      ]
    })
    const updated = editor.graph.getNode(home.id)?.reactions?.[0]
    expect(updated?.trigger.direction).toBe('up')
    expect(updated?.actions[0].transition?.type).toBe('DISSOLVE')

    editor.undo.undo()
    expect(editor.graph.getNode(home.id)?.reactions?.[0].actions[0].transition).toBeUndefined()
  })

  test('flows can be added, edited, and removed with undo', () => {
    const { editor, pageId, home } = setup()
    const flows = () => editor.graph.getNode(pageId)?.prototypeFlows ?? []

    expect(editor.addFlow(pageId, home.id)).toBe('Flow 1')
    expect(editor.addFlow(pageId, home.id)).toBeNull()
    editor.updateFlow(pageId, home.id, { name: 'Checkout', description: 'Happy path' })
    expect(flows()).toEqual([{ name: 'Checkout', startNodeId: home.id, description: 'Happy path' }])

    editor.undo.undo()
    expect(flows()[0]?.name).toBe('Flow 1')
    editor.removeFlow(pageId, home.id)
    expect(flows()).toEqual([])
    editor.undo.undo()
    expect(flows()).toHaveLength(1)
  })

  test('replacing a trigger drops fields from the previous trigger type', () => {
    const { editor, home, details } = setup()
    editor.addReaction(home.id, {
      trigger: { type: 'AFTER_DELAY', delay: 800 },
      actions: [{ type: 'NAVIGATE', destinationId: details.id }]
    })
    editor.updateReaction(home.id, 0, { trigger: { type: 'ON_KEY_DOWN', keys: ['Space'] } })
    expect(editor.graph.getNode(home.id)?.reactions?.[0].trigger).toEqual({
      type: 'ON_KEY_DOWN',
      keys: ['Space']
    })
  })

  test('removeReaction and setPrototypeStartNode are undoable', () => {
    const { editor, pageId, home, details } = setup()
    editor.addReaction(home.id, {
      trigger: { type: 'ON_CLICK' },
      actions: [{ type: 'NAVIGATE', destinationId: details.id }]
    })
    editor.removeReaction(home.id, 0)
    expect(editor.graph.getNode(home.id)?.reactions ?? []).toHaveLength(0)
    editor.undo.undo()
    expect(editor.graph.getNode(home.id)?.reactions).toHaveLength(1)

    editor.setPrototypeStartNode(pageId, home.id)
    expect(editor.graph.getNode(pageId)?.prototypeStartNodeId).toBe(home.id)
    editor.undo.undo()
    expect(editor.graph.getNode(pageId)?.prototypeStartNodeId ?? null).toBeNull()
  })
})
