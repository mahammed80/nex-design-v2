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

    const instance = editor.graph.createInstance(component.id, pageId)
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

  test('binds text, visibility, and nested instance swaps with undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const iconA = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon A' })
    const iconB = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon B' })
    const component = editor.graph.createNode('COMPONENT', pageId, {
      name: 'Bound Card',
      componentPropertyDefinitions: [
        { id: 'title', name: 'Title', type: 'TEXT', defaultValue: 'Default' },
        { id: 'visible', name: 'Visible', type: 'BOOLEAN', defaultValue: true },
        { id: 'icon', name: 'Icon', type: 'INSTANCE_SWAP', defaultValue: iconA.id }
      ]
    })
    const title = editor.graph.createNode('TEXT', component.id, {
      name: 'Title layer',
      text: 'Default'
    })
    const badge = editor.graph.createNode('RECTANGLE', component.id, { name: 'Badge' })
    const icon = editor.graph.createInstance(iconA.id, component.id, { name: 'Bound icon' })
    if (!icon) throw new Error('Failed to create nested instance')

    expect(editor.bindComponentProperty(component.id, title.id, 'title', 'TEXT')).toBe(true)
    expect(editor.bindComponentProperty(component.id, badge.id, 'visible', 'BOOLEAN')).toBe(true)
    expect(editor.bindComponentProperty(component.id, icon.id, 'icon', 'INSTANCE_SWAP')).toBe(true)

    const instance = editor.graph.createInstance(component.id, pageId, { name: 'Card instance' })
    if (!instance) throw new Error('Failed to create card instance')

    expect(editor.setComponentPropertyValue(instance.id, 'Title', 'Pro Plan')).toBe(true)
    expect(editor.setComponentPropertyValue(instance.id, 'Visible', false)).toBe(true)
    expect(editor.setComponentPropertyValue(instance.id, 'Icon', iconB.id)).toBe(true)

    const children = () => editor.graph.getChildren(instance.id)
    expect(children().find((child) => child.name === 'Title layer')?.text).toBe('Pro Plan')
    expect(children().find((child) => child.name === 'Badge')?.visible).toBe(false)
    expect(children().find((child) => child.name === 'Bound icon')?.componentId).toBe(iconB.id)

    editor.undo.undo()
    expect(children().find((child) => child.name === 'Bound icon')?.componentId).toBe(iconA.id)
    editor.undo.redo()
    expect(children().find((child) => child.name === 'Bound icon')?.componentId).toBe(iconB.id)

    expect(editor.resetInstanceOverrides(instance.id)).toBe(true)
    expect(children().find((child) => child.name === 'Title layer')?.text).toBe('Default')
    expect(children().find((child) => child.name === 'Badge')?.visible).toBe(true)
    expect(children().find((child) => child.name === 'Bound icon')?.componentId).toBe(iconA.id)
    editor.undo.undo()
    expect(children().find((child) => child.name === 'Title layer')?.text).toBe('Pro Plan')
    expect(children().find((child) => child.name === 'Bound icon')?.componentId).toBe(iconB.id)
  })
})
