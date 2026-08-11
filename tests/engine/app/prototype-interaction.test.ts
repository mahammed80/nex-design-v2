import { describe, expect, test } from 'bun:test'

import { reactive } from 'vue'

import { createEditorStore } from '@/app/editor/session'
import { HistoryManager } from '@/app/prototype/history-manager'
import { InteractionEngine } from '@/app/prototype/interaction-engine'
import { NavigationController } from '@/app/prototype/navigation-controller'
import { TransitionEngine } from '@/app/prototype/transition-engine'
import type { PresentationState } from '@/app/prototype/types'

function createEngine() {
  const editor = createEditorStore()
  const state = reactive<PresentationState>({
    isOpen: true,
    activeFrameId: '',
    zoomMode: 'FIT',
    customZoom: 1,
    deviceType: 'NONE',
    showDeviceFrame: false,
    isFullscreen: false,
    transitionName: 'instant',
    transitionDuration: 300
  })
  const navigation = new NavigationController(
    editor,
    new HistoryManager(),
    new TransitionEngine(),
    state
  )
  return { editor, engine: new InteractionEngine(editor, navigation) }
}

describe('prototype interaction actions', () => {
  test('returns overlay and scroll instructions', () => {
    const { editor, engine } = createEngine()
    const pageId = editor.state.currentPageId
    const source = editor.graph.createNode('FRAME', pageId, {
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

    expect(engine.handleInteraction(source.id, 'ON_CLICK')).toEqual({
      handled: true,
      actionType: 'OPEN_OVERLAY',
      overlayId: 'overlay',
      overlaySettings: { backdrop: true, closeOnOutsideClick: false }
    })
    expect(engine.handleInteraction(source.id, 'MOUSE_DOWN')).toEqual({
      handled: true,
      actionType: 'SCROLL_TO',
      scrollTargetId: 'target'
    })
  })

  test('sets a variable in its active mode', () => {
    const { editor, engine } = createEngine()
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

    expect(engine.handleInteraction(source.id, 'ON_CLICK')).toBe(true)
    expect(variable.valuesByMode[collection.defaultModeId]).toBe(true)
  })

  test('changes an instance to the matching component variant', () => {
    const { editor, engine } = createEngine()
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

    expect(engine.handleInteraction(instance.id, 'ON_CLICK')).toBe(true)
    expect(editor.graph.getNode(instance.id)?.componentId).toBe(onComponent.id)
  })
})
