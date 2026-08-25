import { describe, expect, test } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'

function setupVariants() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const componentSet = editor.graph.createNode('COMPONENT_SET', pageId, {
    componentPropertyDefinitions: [
      {
        id: 'state',
        name: 'State',
        type: 'VARIANT',
        defaultValue: 'Default',
        variantOptions: ['Default', 'Hover']
      }
    ]
  })
  const defaultComponent = editor.graph.createNode('COMPONENT', componentSet.id, {
    name: 'State=Default',
    componentPropertyValues: { State: 'Default' }
  })
  const defaultLabel = editor.graph.createNode('TEXT', defaultComponent.id, {
    name: 'Label',
    text: 'Default',
    componentLineageId: 'button-label'
  })
  const hoverComponent = editor.graph.createNode('COMPONENT', componentSet.id, {
    name: 'State=Hover',
    componentPropertyValues: { State: 'Hover' }
  })
  editor.graph.createNode('TEXT', hoverComponent.id, {
    name: 'Label',
    text: 'Hover',
    componentLineageId: 'button-label'
  })
  const instance = editor.graph.createInstance(defaultComponent.id, pageId)
  if (!instance) throw new Error('Expected instance')
  const instanceLabel = editor.graph.getChildren(instance.id)[0]
  if (!instanceLabel) throw new Error('Expected instance label')

  return { editor, instance, instanceLabel, defaultComponent, defaultLabel, hoverComponent }
}

describe('variant instance overrides', () => {
  test('records descendant edits with stable lineage identity', () => {
    const { editor, instance, instanceLabel } = setupVariants()

    editor.updateNodeWithUndo(instanceLabel.id, { text: 'Custom' }, 'Edit instance text')

    expect(instance.overrides['button-label:text']).toBe('Custom')
    expect(instance.overrides[`${instanceLabel.id}:text`]).toBeUndefined()
  })

  test('preserves compatible overrides and node identity while switching', () => {
    const { editor, instance, instanceLabel } = setupVariants()
    editor.updateNodeWithUndo(instanceLabel.id, { text: 'Custom' }, 'Edit instance text')

    editor.switchInstanceVariant(instance.id, 'State', 'Hover')

    const switchedLabel = editor.graph.getChildren(instance.id)[0]
    expect(instance.componentId).not.toBeNull()
    expect(switchedLabel.id).toBe(instanceLabel.id)
    expect(switchedLabel.text).toBe('Custom')
    expect(instance.overrides['button-label:text']).toBe('Custom')
  })

  test('restores edited values and override metadata through undo and redo', () => {
    const { editor, instance, instanceLabel } = setupVariants()
    editor.updateNodeWithUndo(instanceLabel.id, { text: 'Custom' }, 'Edit instance text')

    editor.undo.undo()
    expect(instanceLabel.text).toBe('Default')
    expect(instance.overrides['button-label:text']).toBeUndefined()

    editor.undo.redo()
    expect(instanceLabel.text).toBe('Custom')
    expect(instance.overrides['button-label:text']).toBe('Custom')
  })

  test('preserves root overrides during component synchronization', () => {
    const { editor, instance, defaultComponent } = setupVariants()
    editor.updateNodeWithUndo(instance.id, { opacity: 0.5 }, 'Edit instance opacity')

    editor.graph.updateNode(defaultComponent.id, { opacity: 0.8 })
    editor.graph.syncInstances(defaultComponent.id)

    expect(instance.opacity).toBe(0.5)
    expect(instance.overrides[`${defaultComponent.id}:opacity`]).toBe(0.5)
  })
})
