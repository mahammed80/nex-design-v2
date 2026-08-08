import { describe, expect, test } from 'bun:test'

import {
  findEditableNode,
  findLockedAncestor,
  findSelectableNode,
  findVisibleAncestor,
  getAncestorStack
} from '@nex-design/core/scene-graph'

import { buildNestedFixture } from '#tests/helpers/scene'

describe('hitTestStack', () => {
  test('returns full ancestry outermost-first at a point over nested text', () => {
    const { graph, page } = buildNestedFixture()
    const stack = graph.hitTestStack(40, 40, page.id)
    expect(stack.map((n) => n.type)).toEqual(['FRAME', 'RECTANGLE', 'TEXT'])
  })

  test('ends at the deepest hit node', () => {
    const { graph, page, text } = buildNestedFixture()
    const stack = graph.hitTestStack(40, 40, page.id)
    expect(stack[stack.length - 1].id).toBe(text.id)
  })

  test('returns empty array for empty space', () => {
    const { graph, page } = buildNestedFixture()
    expect(graph.hitTestStack(500, 500, page.id)).toEqual([])
  })

  test('respects the scope (entered container) and excludes it', () => {
    const { graph, frame } = buildNestedFixture()
    const stack = graph.hitTestStack(40, 40, frame.id)
    expect(stack.map((n) => n.type)).toEqual(['RECTANGLE', 'TEXT'])
  })

  test('getAncestorStack stops at scope and excludes it', () => {
    const { graph, page, frame, rect, text } = buildNestedFixture()
    expect(getAncestorStack(graph, text.id, page.id)).toEqual([frame, rect, text])
    expect(getAncestorStack(graph, text.id, frame.id)).toEqual([rect, text])
    expect(getAncestorStack(graph, text.id, rect.id)).toEqual([text])
  })
})

describe('traversal helpers', () => {
  test('findEditableNode finds nearest TEXT in ancestry', () => {
    const { graph, rect, text } = buildNestedFixture()
    expect(findEditableNode(graph, text.id)?.id).toBe(text.id)
    // Walking up from the rect, no TEXT ancestor exists.
    expect(findEditableNode(graph, rect.id)).toBeNull()
  })

  test('findEditableNode returns null when no text ancestor exists', () => {
    const { graph, page } = buildNestedFixture()
    const rect = graph.createNode('RECTANGLE', page.id, { name: 'Solo', x: 0, y: 0 })
    expect(findEditableNode(graph, rect.id)).toBeNull()
  })

  test('findLockedAncestor returns nearest locked node in ancestry', () => {
    const { graph, page, rect, text } = buildNestedFixture()
    graph.updateNode(rect.id, { locked: true })
    expect(findLockedAncestor(graph, text.id)?.id).toBe(rect.id)
    expect(findLockedAncestor(graph, rect.id)?.id).toBe(rect.id)
    expect(findLockedAncestor(graph, page.id)).toBeNull()
  })

  test('findVisibleAncestor returns nearest visible node in ancestry', () => {
    const { graph, rect, text } = buildNestedFixture()
    graph.updateNode(text.id, { visible: false })
    expect(findVisibleAncestor(graph, text.id)?.id).toBe(rect.id)
    expect(findVisibleAncestor(graph, rect.id)?.id).toBe(rect.id)
  })

  test('findSelectableNode skips locked nodes', () => {
    const { graph, frame, rect, text } = buildNestedFixture()
    graph.updateNode(rect.id, { locked: true })
    // Text itself is unlocked, so it is selectable directly.
    expect(findSelectableNode(graph, text.id)?.id).toBe(text.id)
    // Rect is locked; the nearest unlocked ancestor is the frame.
    expect(findSelectableNode(graph, rect.id)?.id).toBe(frame.id)
  })

  test('findSelectableNode respects visibility', () => {
    const { graph, rect, text } = buildNestedFixture()
    graph.updateNode(text.id, { visible: false })
    expect(findSelectableNode(graph, text.id)?.id).toBe(rect.id)
  })
})
