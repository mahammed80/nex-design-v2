import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph } from '@nex-design/core'
import type { SceneNode } from '@nex-design/core/scene-graph'

import { expectDefined } from '#tests/helpers/assert'

setDefaultTimeout(60_000)

function buildPrototype() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const home = graph.createNode('FRAME', page.id, { name: 'Home', width: 100, height: 100 })
  const details = graph.createNode('FRAME', page.id, {
    name: 'Details',
    x: 200,
    width: 100,
    height: 100
  })
  const modal = graph.createNode('FRAME', page.id, { name: 'Modal', x: 400, width: 50, height: 50 })
  const button = graph.createNode('RECTANGLE', home.id, { name: 'Button', width: 40, height: 20 })

  graph.updateNode(button.id, {
    reactions: [
      {
        trigger: { type: 'ON_CLICK' },
        actions: [
          {
            type: 'NAVIGATE',
            destinationId: details.id,
            transition: {
              type: 'PUSH',
              direction: 'RIGHT',
              duration: 450,
              easing: 'EASE_IN_AND_OUT'
            }
          }
        ]
      },
      {
        trigger: { type: 'ON_DRAG', direction: 'up' },
        actions: [
          {
            type: 'OPEN_OVERLAY',
            destinationId: modal.id,
            overlay: { position: 'BOTTOM_CENTER', backdrop: true }
          }
        ]
      },
      {
        trigger: { type: 'AFTER_DELAY', delay: 1500 },
        actions: [{ type: 'URL', url: 'https://example.com' }]
      },
      { trigger: { type: 'MOUSE_ENTER' }, actions: [{ type: 'BACK' }] }
    ]
  })
  graph.updateNode(page.id, {
    prototypeStartNodeId: home.id,
    prototypeFlows: [{ name: 'Onboarding', startNodeId: home.id }],
    prototypeConnections: [
      {
        id: 'proto:abc',
        sourceNodeId: button.id,
        targetNodeId: details.id,
        triggerType: 'ON_CLICK',
        sourceAnchor: { side: 'RIGHT', offset: 0.5 },
        targetAnchor: null,
        routing: 'ELBOW',
        curvature: 0.8,
        customControlPoints: null
      }
    ]
  })
  return graph
}

async function roundtrip(graph: SceneGraph): Promise<SceneGraph> {
  await initCodec()
  const exported = await exportFigFile(graph)
  return parseFigFile(exported.buffer as ArrayBuffer)
}

function byName(graph: SceneGraph, name: string): SceneNode {
  return expectDefined(
    graph.getAllNodes().find((node) => node.name === name),
    name
  )
}

describe('prototype roundtrip', () => {
  test('reactions survive export → re-import with remapped destinations', async () => {
    const back = await roundtrip(buildPrototype())
    const reactions = byName(back, 'Button').reactions ?? []

    expect(reactions).toHaveLength(4)
    expect(reactions[0].actions[0]).toMatchObject({
      type: 'NAVIGATE',
      destinationId: byName(back, 'Details').id,
      transition: { type: 'PUSH', direction: 'RIGHT', duration: 450, easing: 'EASE_IN_AND_OUT' }
    })
    expect(reactions[2].trigger).toEqual({ type: 'AFTER_DELAY', delay: 1500 })
    expect(reactions[2].actions[0]).toMatchObject({ type: 'URL', url: 'https://example.com' })
    expect(reactions[3]).toMatchObject({
      trigger: { type: 'MOUSE_ENTER' },
      actions: [{ type: 'BACK' }]
    })
  })

  test('fields without a native Kiwi slot round-trip through pluginData', async () => {
    const back = await roundtrip(buildPrototype())
    const button = byName(back, 'Button')
    const drag = expectDefined(button.reactions?.[1], 'drag reaction')

    expect(drag.trigger.direction).toBe('up')
    expect(drag.actions[0]).toMatchObject({
      type: 'OPEN_OVERLAY',
      destinationId: byName(back, 'Modal').id,
      overlay: { position: 'BOTTOM_CENTER', backdrop: true }
    })
    expect(button.pluginData.some((entry) => entry.key === 'prototypeReactionExtras')).toBe(false)
  })

  test('start node, flows, and connection geometry survive', async () => {
    const back = await roundtrip(buildPrototype())
    const page = back.getPages()[0]
    const home = byName(back, 'Home')

    expect(page.prototypeStartNodeId).toBe(home.id)
    expect(page.prototypeFlows).toEqual([{ name: 'Onboarding', startNodeId: home.id }])

    const connections = page.prototypeConnections ?? []
    expect(connections).toHaveLength(2)
    const click = expectDefined(
      connections.find((c) => c.triggerType === 'ON_CLICK'),
      'click connection'
    )
    expect(click).toMatchObject({
      sourceNodeId: byName(back, 'Button').id,
      targetNodeId: byName(back, 'Details').id,
      routing: 'ELBOW',
      curvature: 0.8
    })
  })

  test('keyboard triggers, manual overlay offsets, and flow descriptions survive', async () => {
    const graph = buildPrototype()
    const button = byName(graph, 'Button')
    const page = graph.getPages()[0]
    graph.updateNode(button.id, {
      reactions: [
        {
          trigger: { type: 'ON_KEY_DOWN', keys: ['ArrowRight', 'KeyD'] },
          actions: [
            {
              type: 'OPEN_OVERLAY',
              destinationId: byName(graph, 'Modal').id,
              overlay: { position: 'MANUAL', offset: { x: 24, y: 48 } }
            }
          ]
        }
      ]
    })
    graph.updateNode(page.id, {
      prototypeFlows: [
        { name: 'Onboarding', startNodeId: byName(graph, 'Home').id, description: 'First run' }
      ]
    })

    const back = await roundtrip(graph)
    const reaction = expectDefined(byName(back, 'Button').reactions?.[0], 'key reaction')
    expect(reaction.trigger).toEqual({ type: 'ON_KEY_DOWN', keys: ['ArrowRight', 'KeyD'] })
    expect(reaction.actions[0].overlay).toMatchObject({
      position: 'MANUAL',
      offset: { x: 24, y: 48 }
    })
    expect(back.getPages()[0].prototypeFlows?.[0]?.description).toBe('First run')
  })

  test('a reaction whose destination was deleted keeps its action without a dangling id', async () => {
    const graph = buildPrototype()
    graph.deleteNode(byName(graph, 'Details').id)
    const back = await roundtrip(graph)
    const navigate = byName(back, 'Button').reactions?.[0]?.actions[0]

    expect(navigate?.type).toBe('NAVIGATE')
    expect(navigate?.destinationId).toBeUndefined()
  })

  test('native device, scrolling, preserved position, and custom easing survive', async () => {
    const graph = buildPrototype()
    const home = byName(graph, 'Home')
    const button = byName(graph, 'Button')
    const details = byName(graph, 'Details')

    graph.updateNode(home.id, {
      scrollDirection: 'VERTICAL',
      prototypeDevice: {
        type: 'PRESET',
        size: { x: 390, y: 844 },
        presetIdentifier: 'APPLE_IPHONE_14',
        rotation: 'NONE'
      }
    })
    graph.updateNode(button.id, {
      scrollBehavior: 'FIXED_WHEN_CHILD_OF_SCROLLING_FRAME',
      reactions: [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [
            {
              type: 'NAVIGATE',
              destinationId: details.id,
              preserveScrollPosition: true,
              scrollOffset: { x: 0, y: 48 },
              transition: {
                type: 'SMART',
                duration: 420,
                easing: 'CUSTOM_CUBIC',
                easingFunction: [0.2, 0.8, 0.4, 1]
              }
            }
          ]
        }
      ]
    })

    const back = await roundtrip(graph)
    const importedHome = byName(back, 'Home')
    const importedButton = byName(back, 'Button')
    const action = importedButton.reactions?.[0]?.actions[0]

    expect(importedHome.scrollDirection).toBe('VERTICAL')
    expect(importedHome.prototypeDevice).toEqual({
      type: 'PRESET',
      size: { x: 390, y: 844 },
      presetIdentifier: 'APPLE_IPHONE_14',
      rotation: 'NONE'
    })
    expect(importedButton.scrollBehavior).toBe('FIXED_WHEN_CHILD_OF_SCROLLING_FRAME')
    expect(action).toMatchObject({
      type: 'NAVIGATE',
      destinationId: byName(back, 'Details').id,
      preserveScrollPosition: true,
      scrollOffset: { x: 0, y: 48 },
      transition: {
        type: 'SMART',
        duration: 420,
        easing: 'CUSTOM_CUBIC'
      }
    })
    const easingFunction = action?.transition?.easingFunction ?? []
    expect(easingFunction).toHaveLength(4)
    expect(easingFunction[0]).toBeCloseTo(0.2)
    expect(easingFunction[1]).toBeCloseTo(0.8)
    expect(easingFunction[2]).toBeCloseTo(0.4)
    expect(easingFunction[3]).toBeCloseTo(1)
  })
})
