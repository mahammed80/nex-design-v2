import { describe, expect, test } from 'bun:test'

import { getTool, setupToolTest, type ToolResult } from '#tests/helpers/tools'

function frames() {
  const { figma } = setupToolTest()
  const home = figma.createFrame()
  home.name = 'Home'
  const details = figma.createFrame()
  details.name = 'Details'
  return { figma, home, details }
}

describe('prototype tools', () => {
  test('add_navigation adds a directional push and syncs a connection', () => {
    const { figma, home, details } = frames()
    const result = getTool('add_navigation').execute(figma, {
      id: home.id,
      destination_id: details.id,
      transition: 'PUSH',
      direction: 'LEFT'
    }) as ToolResult
    expect(result.error).toBeUndefined()

    const reaction = figma.graph.getNode(home.id)?.reactions?.[0]
    expect(reaction?.actions[0]).toMatchObject({
      type: 'NAVIGATE',
      destinationId: details.id,
      transition: { type: 'PUSH', direction: 'LEFT' }
    })
    const page = figma.graph.getNode(figma.currentPageId)
    expect(page?.prototypeConnections?.length).toBe(1)
  })

  test('add_navigation rejects unknown destinations and enums', () => {
    const { figma, home } = frames()
    const tool = getTool('add_navigation')
    expect(
      (tool.execute(figma, { id: home.id, destination_id: 'nope' }) as ToolResult).error
    ).toBeDefined()
    expect(
      (
        tool.execute(figma, {
          id: home.id,
          destination_id: home.id,
          transition: 'WOBBLE'
        }) as ToolResult
      ).error
    ).toBeDefined()
  })

  test('set_reactions replaces and clears; list_reactions reads them back', () => {
    const { figma, home, details } = frames()
    const set = getTool('set_reactions')
    set.execute(figma, {
      id: home.id,
      reactions: JSON.stringify([
        {
          trigger: { type: 'ON_KEY_DOWN', keys: ['ArrowRight'] },
          actions: [{ type: 'NAVIGATE', destinationId: details.id }]
        }
      ])
    })
    const listed = getTool('list_reactions').execute(figma, {}) as ToolResult & {
      interactions: Array<{ nodeId: string }>
    }
    expect(listed.interactions.map((entry) => entry.nodeId)).toEqual([home.id])

    set.execute(figma, { id: home.id, reactions: '[]' })
    expect(figma.graph.getNode(home.id)?.reactions).toEqual([])
    expect(
      (
        set.execute(figma, {
          id: home.id,
          reactions: '[{"trigger":{"type":"NOPE"},"actions":[]}]'
        }) as ToolResult
      ).error
    ).toBeDefined()
  })

  test('set_flow_start adds, defaults, and removes a flow', () => {
    const { figma, home } = frames()
    const tool = getTool('set_flow_start')
    tool.execute(figma, { id: home.id, name: 'Onboarding', default: true })
    const page = () => figma.graph.getNode(figma.currentPageId)
    expect(page()?.prototypeFlows).toEqual([{ name: 'Onboarding', startNodeId: home.id }])
    expect(page()?.prototypeStartNodeId).toBe(home.id)

    tool.execute(figma, { id: home.id, remove: true })
    expect(page()?.prototypeFlows).toEqual([])
    expect(page()?.prototypeStartNodeId).toBeNull()
  })

  test('node proxies expose reactions and setReactionsAsync', async () => {
    const { figma, home, details } = frames()
    await home.setReactionsAsync([
      { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NAVIGATE', destinationId: details.id }] }
    ])
    expect(home.reactions).toHaveLength(1)
    expect(Object.isFrozen(home.reactions)).toBe(true)
    expect(figma.graph.getNode(figma.currentPageId)?.prototypeConnections?.length).toBe(1)
  })
})
