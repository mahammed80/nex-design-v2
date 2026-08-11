import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@nex-design/core/scene-graph'

import {
  buildAgentDocumentContext,
  buildAgentInstructions,
  classifyAgentIntent,
  getLatestUserRequest
} from '@/app/ai/chat/agent-instructions'
import { resolveEffectiveModelId } from '@/app/ai/chat/model-profiles'

describe('agent instructions', () => {
  test('extracts the latest user text and classifies its intent', () => {
    const request = getLatestUserRequest([
      { role: 'user', content: 'Create a dashboard' },
      { role: 'assistant', content: 'Working on it' },
      { role: 'user', content: [{ type: 'text', text: 'Review the selected card' }] }
    ])

    expect(request).toBe('Review the selected card')
    expect(classifyAgentIntent(request)).toBe('inspect')
    expect(classifyAgentIntent('Build a mobile checkout')).toBe('create')
    expect(classifyAgentIntent('Make the selected title larger')).toBe('modify')
  })

  test('summarizes the active page, layers, and selection', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const card = graph.createNode('FRAME', page.id, {
      name: 'Checkout Card',
      width: 360,
      height: 480
    })
    graph.createNode('TEXT', card.id, { name: 'Title', text: 'Checkout' })

    const context = buildAgentDocumentContext({
      graph,
      state: { currentPageId: page.id, selectedIds: new Set([card.id]) }
    })

    expect(context).toContain('Page 1 (2 nodes)')
    expect(context).toContain('Checkout Card (FRAME, 360x480)')
    expect(context).toContain(`${card.id}: Checkout Card`)
  })

  test('injects layered creation guidance', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const instructions = buildAgentInstructions({
      store: { graph, state: { currentPageId: page.id, selectedIds: new Set() } },
      request: 'Design a landing page'
    })

    expect(instructions).toContain('1. Skeleton:')
    expect(instructions).toContain('2. Content:')
    expect(instructions).toContain('4. Validate:')
    expect(instructions).toContain('Task mode: create.')
  })
})

describe('model id resolution', () => {
  test('prefers a configured custom model id', () => {
    expect(resolveEffectiveModelId('gpt-5', ' local-model ')).toBe('local-model')
    expect(resolveEffectiveModelId('gpt-5', ' ')).toBe('gpt-5')
  })
})
