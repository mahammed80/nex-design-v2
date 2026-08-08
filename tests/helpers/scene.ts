import { SceneGraph } from '@nex-design/core'
import type { SceneNode } from '@nex-design/core'

export function makeSceneGraph(pageName = 'Test'): SceneGraph {
  const graph = new SceneGraph()
  graph.addPage(pageName)
  return graph
}

export function firstPageId(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

export function createRect(
  graph: SceneGraph,
  parentId: string,
  props: { name?: string; x?: number; y?: number; width?: number; height?: number } = {}
): SceneNode {
  return graph.createNode('RECTANGLE', parentId, {
    name: props.name ?? 'Rect',
    x: props.x ?? 0,
    y: props.y ?? 0,
    width: props.width ?? 50,
    height: props.height ?? 50
  })
}

/**
 * Build a page -> frame -> rect -> text graph for hit-test and interaction
 * tests. Text sits inside the rect inside the frame.
 */
export function buildNestedFixture(): {
  graph: SceneGraph
  page: SceneNode
  frame: SceneNode
  rect: SceneNode
  text: SceneNode
} {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Frame',
    x: 0,
    y: 0,
    width: 200,
    height: 200
  })
  const rect = graph.createNode('RECTANGLE', frame.id, {
    name: 'Rect',
    x: 10,
    y: 10,
    width: 100,
    height: 100
  })
  const text = graph.createNode('TEXT', rect.id, {
    name: 'Text',
    x: 20,
    y: 20,
    width: 50,
    height: 30,
    text: 'hi'
  })
  return { graph, page, frame, rect, text }
}
