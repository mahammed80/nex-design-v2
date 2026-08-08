import { describe, expect, test } from 'bun:test'

import { createInteractionDispatcher } from '@nex-design/core/interaction'
import type { InteractionEvent } from '@nex-design/core/interaction'

import { buildNestedFixture } from '#tests/helpers/scene'

describe('interaction dispatcher — phases', () => {
  test('dispatches capture -> target -> bubble over the ancestry stack', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    for (const node of [page, frame, rect, text]) {
      dispatcher.on(node.id, 'click', (e) => calls.push(`${node.name}:${e.phase}`))
    }
    dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(calls).toEqual([
      'Page 1:capture',
      'Frame:capture',
      'Rect:capture',
      'Text:target',
      'Rect:bubble',
      'Frame:bubble',
      'Page 1:bubble'
    ])
  })

  test('target and currentTarget are set per node during the walk', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const targets: string[] = []
    const currents: string[] = []
    for (const node of [page, frame, rect, text]) {
      dispatcher.on(node.id, 'click', (e) => {
        targets.push(e.targetId)
        currents.push(e.currentTargetId)
      })
    }
    dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(targets.every((id) => id === text.id)).toBe(true)
    expect(currents).toEqual([page.id, frame.id, rect.id, text.id, rect.id, frame.id, page.id])
  })

  test('dispatchAt builds the stack from a target id and scope', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    dispatcher.on(frame.id, 'dblclick', (e) => calls.push(`frame:${e.phase}`))
    dispatcher.on(rect.id, 'dblclick', (e) => calls.push(`rect:${e.phase}`))
    dispatcher.on(text.id, 'dblclick', (e) => calls.push(`text:${e.phase}`))
    dispatcher.dispatchAt(text.id, 'dblclick', {}, page.id)
    // Page is the scope and is excluded from the stack.
    expect(calls).toEqual([
      'frame:capture',
      'rect:capture',
      'text:target',
      'rect:bubble',
      'frame:bubble'
    ])
  })

  test('empty stack returns an event targeting the graph root', () => {
    const { graph } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const event = dispatcher.dispatchStack([], 'click')
    expect(event.targetId).toBe(graph.rootId)
  })
})

describe('interaction dispatcher — propagation control', () => {
  test('preventDefault marks the event', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    dispatcher.on(text.id, 'click', (e) => e.preventDefault())
    const event = dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(event.defaultPrevented).toBe(true)
  })

  test('stopPropagation in the target skips the bubble phase', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    dispatcher.on(frame.id, 'click', (e) => calls.push(`frame:${e.phase}`))
    dispatcher.on(text.id, 'click', (e) => {
      calls.push(`text:${e.phase}`)
      e.stopPropagation()
    })
    dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(calls).toEqual(['frame:capture', 'text:target'])
  })

  test('stopPropagation in the capture phase skips target and bubble', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    dispatcher.on(frame.id, 'click', (e) => {
      calls.push(`frame:${e.phase}`)
      e.stopPropagation()
    })
    dispatcher.on(text.id, 'click', (e) => calls.push(`text:${e.phase}`))
    dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(calls).toEqual(['frame:capture'])
  })

  test('stopImmediatePropagation halts the remaining dispatch entirely', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    dispatcher.on(frame.id, 'click', (e) => calls.push(`frame:${e.phase}`))
    dispatcher.on(text.id, 'click', (e) => {
      calls.push('first')
      e.stopImmediatePropagation()
    })
    dispatcher.on(text.id, 'click', () => calls.push('second'))
    dispatcher.dispatchStack([page, frame, rect, text], 'click')
    expect(calls).toEqual(['frame:capture', 'first'])
  })

  test('missing nodes in the stack are skipped', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const calls: string[] = []
    dispatcher.on(frame.id, 'click', (e) => calls.push(`frame:${e.phase}`))
    dispatcher.on(text.id, 'click', (e) => calls.push(`text:${e.phase}`))
    graph.deleteNode(rect.id)
    const stale = [page, frame, rect, text]
    dispatcher.dispatchStack(stale, 'click')
    expect(calls).toEqual(['frame:capture', 'frame:bubble'])
  })
})

describe('interaction dispatcher — listeners', () => {
  test('on/off and unbind work', () => {
    const { graph, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    let count = 0
    const handler = () => {
      count++
    }
    const unbind = dispatcher.on(text.id, 'click', handler)
    dispatcher.dispatchAt(text.id, 'click')
    expect(count).toBe(1)
    unbind()
    dispatcher.dispatchAt(text.id, 'click')
    expect(count).toBe(1)
  })

  test('hasListeners reflects registrations', () => {
    const { graph, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    expect(dispatcher.hasListeners()).toBe(false)
    let calls = 0
    dispatcher.on(text.id, 'click', () => {
      calls++
    })
    expect(dispatcher.hasListeners()).toBe(true)
    expect(dispatcher.hasListeners(text.id)).toBe(true)
    expect(dispatcher.hasListeners(text.id, 'click')).toBe(true)
    expect(dispatcher.hasListeners(text.id, 'pointerdown')).toBe(false)
    expect(dispatcher.hasListeners('missing')).toBe(false)
    expect(calls).toBe(0)
  })

  test('onNodeDeleted prunes listeners for a deleted node', () => {
    const { graph, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    let count = 0
    dispatcher.on(text.id, 'click', () => {
      count++
    })
    dispatcher.onNodeDeleted(text.id)
    dispatcher.dispatchAt(text.id, 'click')
    expect(count).toBe(0)
    expect(dispatcher.hasListeners(text.id)).toBe(false)
  })

  test('clear removes every listener', () => {
    const { graph, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    let count = 0
    dispatcher.on(text.id, 'click', () => {
      count++
    })
    dispatcher.clear()
    dispatcher.dispatchAt(text.id, 'click')
    expect(count).toBe(0)
    expect(dispatcher.hasListeners()).toBe(false)
  })
})

describe('interaction dispatcher — hover changes', () => {
  test('pointerenter fires outer -> inner for newly entered nodes', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const order: string[] = []
    dispatcher.on(frame.id, 'pointerenter', () => order.push('frame'))
    dispatcher.on(rect.id, 'pointerenter', () => order.push('rect'))
    dispatcher.on(text.id, 'pointerenter', () => order.push('text'))
    dispatcher.dispatchHoverChange([page, rect], [page, frame, rect, text])
    expect(order).toEqual(['frame', 'text'])
  })

  test('pointerleave fires inner -> outer for departed nodes', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    const order: string[] = []
    dispatcher.on(frame.id, 'pointerleave', () => order.push('frame'))
    dispatcher.on(rect.id, 'pointerleave', () => order.push('rect'))
    dispatcher.on(text.id, 'pointerleave', () => order.push('text'))
    dispatcher.dispatchHoverChange([page, frame, rect, text], [page, rect])
    expect(order).toEqual(['text', 'frame'])
  })

  test('no events fire when the hover path is unchanged', () => {
    const { graph, page, frame, rect } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    let count = 0
    dispatcher.on(frame.id, 'pointerenter', () => count++)
    dispatcher.on(rect.id, 'pointerleave', () => count++)
    dispatcher.dispatchHoverChange([page, frame, rect], [page, frame, rect])
    expect(count).toBe(0)
  })
})

describe('interaction dispatcher — event fields', () => {
  test('carries point, modifiers, button, clickCount, and key', () => {
    const { graph, text } = buildNestedFixture()
    const dispatcher = createInteractionDispatcher(() => graph)
    let seen: InteractionEvent | null = null
    dispatcher.on(text.id, 'pointerdown', (e) => {
      seen = e
    })
    dispatcher.dispatchAt(text.id, 'pointerdown', {
      point: { x: 40, y: 40 },
      screenPoint: { x: 100, y: 50 },
      button: 2,
      shiftKey: true,
      ctrlKey: true,
      altKey: true,
      metaKey: true,
      clickCount: 2,
      key: 'Enter',
      raw: { type: 'pointerdown' }
    })
    if (!seen) throw new Error('expected an event')
    expect(seen.point).toEqual({ x: 40, y: 40 })
    expect(seen.screenPoint).toEqual({ x: 100, y: 50 })
    expect(seen.button).toBe(2)
    expect(seen.modifiers).toEqual({ shift: true, ctrl: true, alt: true, meta: true })
    expect(seen.clickCount).toBe(2)
    expect(seen.key).toBe('Enter')
    expect(seen.targetId).toBe(text.id)
    expect(seen.type).toBe('pointerdown')
  })
})
