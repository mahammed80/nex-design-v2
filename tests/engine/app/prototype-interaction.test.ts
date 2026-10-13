import { describe, expect, test } from 'bun:test'

import { createEditorStore } from '@/app/editor/session'
import { PresentationManager } from '@/app/prototype/presentation-manager'

function createPlayer() {
  const editor = createEditorStore()
  const presentation = new PresentationManager(editor)
  const start = () => presentation.prototypeEngine.stateManager.initialize()
  return { editor, presentation, start }
}

describe('prototype player actions', () => {
  test('opens overlays and returns scroll targets per trigger', () => {
    const { editor, presentation, start } = createPlayer()
    const source = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      reactions: [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [
            {
              type: 'OPEN_OVERLAY',
              destinationId: 'overlay',
              overlay: { backdrop: true, closeOnOutsideClick: false }
            }
          ]
        },
        {
          trigger: { type: 'MOUSE_DOWN' },
          actions: [{ type: 'SCROLL_TO', destinationId: 'target' }]
        }
      ]
    })
    start()

    expect(presentation.handleInteraction(source.id, 'ON_CLICK')).toBeUndefined()
    expect(presentation.activeOverlay).toMatchObject({
      isOpen: true,
      nodeId: 'overlay',
      settings: { backdrop: true, closeOnOutsideClick: false }
    })
    expect(presentation.handleInteraction(source.id, 'MOUSE_DOWN')).toEqual({
      handled: true,
      scrollTargetId: 'target'
    })
  })

  test('mouse-down and mouse-up do not fire click reactions', () => {
    const { editor, presentation, start } = createPlayer()
    const source = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      reactions: [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'SCROLL_TO', destinationId: 'target' }] }
      ]
    })
    start()

    expect(presentation.handleInteraction(source.id, 'MOUSE_DOWN')).toBeUndefined()
    expect(presentation.handleInteraction(source.id, 'MOUSE_UP')).toBeUndefined()
    expect(presentation.handleInteraction(source.id, 'UNKNOWN_TRIGGER')).toBeUndefined()
    expect(presentation.handleInteraction(source.id, 'ON_CLICK')).toEqual({
      handled: true,
      scrollTargetId: 'target'
    })
  })

  test('set-variable changes the preview session, not the document', () => {
    const { editor, presentation, start } = createPlayer()
    const collection = editor.graph.createCollection('Prototype state')
    const variable = editor.graph.createVariable('Enabled', 'BOOLEAN', collection.id, false)
    const source = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      reactions: [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'SET_VARIABLE', variableId: variable.id, variableValue: true }]
        }
      ]
    })
    start()

    presentation.handleInteraction(source.id, 'ON_CLICK')
    expect(presentation.prototypeEngine.stateManager.getVariableValue(variable.id)).toBe(true)
    expect(variable.valuesByMode[collection.defaultModeId]).toBe(false)
  })

  test('change-to resolves the matching variant inside the preview only', () => {
    const { editor, presentation, start } = createPlayer()
    const pageId = editor.state.currentPageId
    const componentSet = editor.graph.createNode('COMPONENT_SET', pageId, {
      componentPropertyDefinitions: [
        {
          id: 'state-property',
          name: 'State',
          type: 'VARIANT',
          defaultValue: 'Off',
          variantOptions: ['Off', 'On']
        }
      ]
    })
    const offComponent = editor.graph.createNode('COMPONENT', componentSet.id, {
      componentPropertyValues: { State: 'Off' }
    })
    const onComponent = editor.graph.createNode('COMPONENT', componentSet.id, {
      componentPropertyValues: { State: 'On' }
    })
    const instance = editor.graph.createInstance(offComponent.id, pageId)
    expect(instance).toBeDefined()
    if (!instance) return
    editor.graph.updateNode(instance.id, {
      reactions: [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'CHANGE_TO', variantProperties: { State: 'On' } }]
        }
      ]
    })
    start()

    presentation.handleInteraction(instance.id, 'ON_CLICK')
    const state = presentation.prototypeEngine.stateManager
    expect(state.getNode(instance.id)?.componentId).toBe(onComponent.id)
    expect(editor.graph.getNode(instance.id)?.componentId).toBe(offComponent.id)
  })
})
