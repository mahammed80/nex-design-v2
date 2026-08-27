import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Component Properties (Boolean, Text, Instance Swap)', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const component = editor.graph.createNode('COMPONENT', pageId, {
      name: 'CardComponent',
      width: 240,
      height: 120,
      componentPropertyDefinitions: [
        { id: 'showBadge', name: 'Show Badge', type: 'BOOLEAN', defaultValue: true },
        { id: 'titleText', name: 'Title', type: 'TEXT', defaultValue: 'Default Card' },
        { id: 'iconSlot', name: 'Icon', type: 'INSTANCE_SWAP', defaultValue: 'icon-a' }
      ]
    })

    return { editor, component, pageId }
  }


  test('stores and retrieves component property definitions', () => {
    const { editor, component } = setup()
    const node = getNodeOrThrow(editor.graph, component.id)


    expect(node.componentPropertyDefinitions.length).toBe(3)
    expect(node.componentPropertyDefinitions[0].type).toBe('BOOLEAN')
    expect(node.componentPropertyDefinitions[1].type).toBe('TEXT')
    expect(node.componentPropertyDefinitions[2].type).toBe('INSTANCE_SWAP')
  })

  test('applies component property value overrides to instance', () => {
    const { editor, component, pageId } = setup()

    const instance = editor.graph.createInstance(component.id, pageId) as non-null type
    if (!instance) throw new Error('Failed to create instance')


    editor.updateNodeWithUndo(
      instance.id,
      {
        componentPropertyValues: {
          ShowBadge: false,
          Title: 'Pro Plan',
          Icon: 'icon-b'
        }
      },
      'Set Component Properties'
    )


    let current = getNodeOrThrow(editor.graph, instance.id)
    expect(current.componentPropertyValues?.ShowBadge).toBe(false)
    expect(current.componentPropertyValues?.Title).toBe('Pro Plan')
    expect(current.componentPropertyValues?.Icon).toBe('icon-b')


    editor.undo.undo()
    current = getNodeOrThrow(editor.graph, instance.id)
    expect(current.componentPropertyValues?.Title).toBeUndefined()

    editor.undo.redo()
    current = getNodeOrThrow(editor.graph, instance.id)
    expect(current.componentPropertyValues?.Title).toBe('Pro Plan')
  })
})
