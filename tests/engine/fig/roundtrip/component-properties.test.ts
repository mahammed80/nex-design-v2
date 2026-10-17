import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph } from '@nex-design/core'
import type { SceneNode } from '@nex-design/core/scene-graph'

import { expectDefined } from '#tests/helpers/assert'

setDefaultTimeout(60_000)

function byName(graph: SceneGraph, name: string): SceneNode {
  return expectDefined(
    graph.getAllNodes().find((node) => node.name === name),
    name
  )
}

async function roundtrip(graph: SceneGraph): Promise<SceneGraph> {
  await initCodec()
  const exported = await exportFigFile(graph)
  return parseFigFile(exported.buffer as ArrayBuffer)
}

describe('component properties roundtrip', () => {
  test('variant sets, definitions, and instance assignments survive export and re-import', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const iconA = graph.createNode('COMPONENT', page.id, { name: 'Icon A', width: 16, height: 16 })
    const iconB = graph.createNode('COMPONENT', page.id, { name: 'Icon B', width: 16, height: 16 })
    const componentSet = graph.createNode('COMPONENT_SET', page.id, {
      name: 'Button Set',
      width: 260,
      height: 120,
      componentPropertyDefinitions: [
        {
          id: 'prop:state',
          name: 'State',
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Default', 'Active']
        },
        { id: 'prop:label', name: 'Label', type: 'TEXT', defaultValue: 'Button' },
        { id: 'prop:icon', name: 'Show Icon', type: 'BOOLEAN', defaultValue: true },
        {
          id: 'prop:icon-swap',
          name: 'Icon',
          type: 'INSTANCE_SWAP',
          defaultValue: iconA.id
        }
      ]
    })
    const defaultComponent = graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=Default',
      width: 100,
      height: 40,
      componentPropertyValues: { State: 'Default' }
    })
    graph.createNode('TEXT', defaultComponent.id, {
      name: 'Label layer',
      text: 'Button',
      componentPropertyReferences: [{ propertyId: 'prop:label', field: 'TEXT' }]
    })
    graph.createNode('RECTANGLE', defaultComponent.id, {
      name: 'Icon visibility',
      componentPropertyReferences: [{ propertyId: 'prop:icon', field: 'BOOLEAN' }]
    })
    graph.createInstance(iconA.id, defaultComponent.id, {
      name: 'Icon layer',
      componentPropertyReferences: [{ propertyId: 'prop:icon-swap', field: 'INSTANCE_SWAP' }]
    })
    graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=Active',
      x: 120,
      width: 100,
      height: 40,
      componentPropertyValues: { State: 'Active' }
    })
    const instance = graph.createInstance(defaultComponent.id, page.id, {
      name: 'Button Instance',
      x: 320,
      componentPropertyValues: { Label: 'Continue', 'Show Icon': false, Icon: iconB.id }
    })

    const imported = await roundtrip(graph)
    const importedSet = byName(imported, 'Button Set')
    const importedInstance = byName(imported, 'Button Instance')

    expect(importedSet.type).toBe('COMPONENT_SET')
    expect(importedSet.componentPropertyDefinitions).toEqual([
      expect.objectContaining({
        name: 'State',
        type: 'VARIANT',
        defaultValue: 'Default',
        variantOptions: ['Default', 'Active']
      }),
      expect.objectContaining({ name: 'Label', type: 'TEXT', defaultValue: 'Button' }),
      expect.objectContaining({ name: 'Show Icon', type: 'BOOLEAN', defaultValue: true }),
      expect.objectContaining({
        name: 'Icon',
        type: 'INSTANCE_SWAP',
        defaultValue: byName(imported, 'Icon A').id
      })
    ])
    expect(byName(imported, 'State=Default').componentPropertyValues.State).toBe('Default')
    expect(byName(imported, 'State=Active').componentPropertyValues.State).toBe('Active')
    expect(importedInstance.type).toBe('INSTANCE')
    expect(importedInstance.componentId).toBe(byName(imported, 'State=Default').id)
    expect(importedInstance.componentPropertyValues).toMatchObject({
      Label: 'Continue',
      'Show Icon': false,
      Icon: byName(imported, 'Icon B').id
    })
    const importedInstanceChildren = imported.getChildren(importedInstance.id)
    expect(importedInstanceChildren.find((child) => child.name === 'Label layer')?.text).toBe(
      'Continue'
    )
    expect(
      importedInstanceChildren.find((child) => child.name === 'Icon visibility')?.visible
    ).toBe(false)
    expect(importedInstanceChildren.find((child) => child.name === 'Icon layer')?.componentId).toBe(
      byName(imported, 'Icon B').id
    )
    expect(instance.componentPropertyValues['Show Icon']).toBe(false)
  })
})
