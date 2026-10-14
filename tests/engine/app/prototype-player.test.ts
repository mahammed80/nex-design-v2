import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@nex-design/core/scene-graph'

import { createEditorStore } from '@/app/editor/session'
import { PresentationManager } from '@/app/prototype/presentation-manager'
import { buildSessionGraph } from '@/app/prototype/rendering/session-graph'
import {
  FADE_OUT_PREFIX,
  matchLayers,
  smartAnimateFrame
} from '@/app/prototype/rendering/smart-animate'
import { inverseTransition } from '@/app/prototype/transition-engine'

function twoScreens() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const a = graph.createNode('FRAME', page.id, { name: 'A', width: 400, height: 800 })
  const b = graph.createNode('FRAME', page.id, { name: 'B', x: 500, width: 400, height: 800 })
  const solid = (r: number) => [
    { type: 'SOLID' as const, color: { r, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
  ]
  const cardA = graph.createNode('FRAME', a.id, {
    name: 'Card',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: solid(0)
  })
  const cardB = graph.createNode('FRAME', b.id, {
    name: 'Card',
    x: 200,
    y: 400,
    width: 300,
    height: 100,
    fills: solid(1)
  })
  const onlyA = graph.createNode('RECTANGLE', a.id, {
    name: 'Gone',
    x: 10,
    y: 20,
    width: 5,
    height: 5
  })
  const onlyB = graph.createNode('RECTANGLE', b.id, { name: 'New', opacity: 0.8 })
  return { graph, a, b, cardA, cardB, onlyA, onlyB }
}

describe('smart animate', () => {
  test('matches layers by name path under each screen', () => {
    const { graph, a, b, cardA, cardB, onlyB } = twoScreens()
    const matches = matchLayers(graph.nodes, a.id, b.id)
    expect(matches.get(b.id)).toBe(a.id)
    expect(matches.get(cardB.id)).toBe(cardA.id)
    expect(matches.has(onlyB.id)).toBe(false)
  })

  test('tweens matched layers and fades unmatched ones', () => {
    const { graph, a, b, cardB, onlyA, onlyB } = twoScreens()
    const matches = matchLayers(graph.nodes, a.id, b.id)

    const start = smartAnimateFrame(graph.nodes, a.id, b.id, matches, 0)
    expect(start.get(cardB.id)).toMatchObject({ x: 0, y: 0, width: 100 })
    expect(start.get(onlyB.id)?.opacity).toBe(0)

    const middle = smartAnimateFrame(graph.nodes, a.id, b.id, matches, 0.5)
    expect(middle.get(cardB.id)).toMatchObject({ x: 100, y: 200, width: 200 })
    expect(middle.get(cardB.id)?.fills[0].color.r).toBeCloseTo(0.5, 5)
    expect(middle.get(onlyB.id)?.opacity).toBeCloseTo(0.4, 5)
    const fading = middle.get(`${FADE_OUT_PREFIX}${onlyA.id}`)
    expect(fading).toMatchObject({ parentId: b.id, x: 10, y: 20, opacity: 0.5 })
    expect(middle.get(b.id)?.childIds[0]).toBe(`${FADE_OUT_PREFIX}${onlyA.id}`)

    const end = smartAnimateFrame(graph.nodes, a.id, b.id, matches, 1)
    expect(end.get(cardB.id)).toMatchObject({ x: 200, y: 400, width: 300 })
    expect(end.has(`${FADE_OUT_PREFIX}${onlyA.id}`)).toBe(false)
    // The document's nodes are never mutated.
    expect(graph.getNode(cardB.id)?.x).toBe(200)
  })
})

describe('session graph', () => {
  test('applies preview variable values to the active mode only in the copy', () => {
    const graph = new SceneGraph()
    const collection = graph.createCollection('Tokens')
    const variable = graph.createVariable('brand', 'COLOR', collection.id, {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    })
    const red = { r: 1, g: 0, b: 0, a: 1 }
    const session = buildSessionGraph(graph, graph.nodes, new Map([[variable.id, red]]))
    expect(session.resolveColorVariable(variable.id)).toEqual(red)
    expect(graph.resolveColorVariable(variable.id)).toEqual({ r: 0, g: 0, b: 0, a: 1 })
    expect(session.nodes).toBe(graph.nodes)
  })
})

describe('player navigation', () => {
  test('back replays the reverse transition and forward replays the original', () => {
    expect(
      inverseTransition({ type: 'PUSH', direction: 'LEFT', duration: 300, easing: 'LINEAR' })
    ).toMatchObject({
      type: 'PUSH',
      direction: 'RIGHT'
    })
    expect(
      inverseTransition({ type: 'SLIDE_IN', direction: 'BOTTOM', duration: 300, easing: 'LINEAR' })
        .type
    ).toBe('SLIDE_OUT')

    const editor = createEditorStore()
    const page = editor.state.currentPageId
    const home = editor.graph.createNode('FRAME', page, { name: 'Home', width: 100, height: 100 })
    const next = editor.graph.createNode('FRAME', page, {
      name: 'Next',
      x: 200,
      width: 100,
      height: 100
    })
    const player = new PresentationManager(editor)
    player.prototypeEngine.stateManager.initialize()
    player.state.activeFrameId = home.id
    const push = {
      type: 'PUSH' as const,
      direction: 'LEFT' as const,
      duration: 250,
      easing: 'EASE_OUT' as const
    }

    player.navigationController.navigate(next.id, push)
    expect(player.state).toMatchObject({
      activeFrameId: next.id,
      transitionName: 'push-left',
      previousFrameId: home.id
    })

    player.navigationController.goBack()
    expect(player.state).toMatchObject({ activeFrameId: home.id, transitionName: 'push-right' })

    player.navigationController.goForward()
    expect(player.state).toMatchObject({ activeFrameId: next.id, transitionName: 'push-left' })
  })

  test('overlays stack, swap replaces the top, and close pops one at a time', () => {
    const editor = createEditorStore()
    const player = new PresentationManager(editor)
    player.state.activeFrameId = 'screen'
    player.openOverlay('menu', { position: 'TOP_CENTER' }, false)
    player.openOverlay('dialog', undefined, false)
    expect(player.overlays.map((o) => o.nodeId)).toEqual(['menu', 'dialog'])
    expect(player.overlays[1].sourceFrameId).toBe('menu')

    player.openOverlay('sheet', undefined, true)
    expect(player.overlays.map((o) => o.nodeId)).toEqual(['menu', 'sheet'])
    expect(player.activeOverlay).toMatchObject({ isOpen: true, nodeId: 'sheet' })

    expect(player.closeOverlay()).toBe(true)
    expect(player.closeOverlay()).toBe(true)
    expect(player.closeOverlay()).toBe(false)
    expect(player.activeOverlay.isOpen).toBe(false)
  })
})
