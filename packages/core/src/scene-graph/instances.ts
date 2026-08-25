import type { SceneGraph, SceneNode, Fill, Stroke, Effect, StyleRun } from './'
import { copyEffects, copyFills, copyStrokes, copyStyleRuns } from './copy'

const INSTANCE_SYNC_PROPS: (keyof SceneNode)[] = [
  'width',
  'height',
  'fills',
  'strokes',
  'effects',
  'opacity',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'independentCorners',
  'layoutMode',
  'layoutDirection',
  'layoutWrap',
  'primaryAxisAlign',
  'counterAxisAlign',
  'primaryAxisSizing',
  'counterAxisSizing',
  'itemSpacing',
  'counterAxisSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridColumnGap',
  'gridRowGap',
  'gridPosition',
  'clipsContent',
  'independentStrokeWeights',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight'
]

const INSTANCE_CHILD_SYNC_PROPS = [
  ...INSTANCE_SYNC_PROPS,
  'name',
  'x',
  'y',
  'text',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'textDirection',
  'visible'
] satisfies (keyof SceneNode)[]

function sourceLineage(node: SceneNode): string {
  return node.componentLineageId ?? node.id
}

function ensureSourceLineage(graph: SceneGraph, sourceId: string): void {
  const source = graph.nodes.get(sourceId)
  if (!source) return
  if (!source.componentLineageId) source.componentLineageId = source.id
  for (const childId of source.childIds) ensureSourceLineage(graph, childId)
}

export function instanceOverrideKey(lineageId: string, property: keyof SceneNode): string {
  return `${lineageId}:${property}`
}

function hasOverride(
  overrides: Record<string, unknown>,
  instanceNode: SceneNode,
  property: keyof SceneNode
): boolean {
  const lineageId = instanceNode.componentLineageId ?? instanceNode.componentId
  if (lineageId && instanceOverrideKey(lineageId, property) in overrides) return true
  return `${instanceNode.id}:${property}` in overrides
}

function copyProp(
  target: Partial<SceneNode> | SceneNode,
  source: SceneNode,
  key: keyof SceneNode
): void {
  const val = source[key]
  if (key === 'fills') {
    ;(target as Record<string, unknown>)[key] = copyFills(val as Fill[])
  } else if (key === 'strokes') {
    ;(target as Record<string, unknown>)[key] = copyStrokes(val as Stroke[])
  } else if (key === 'effects') {
    ;(target as Record<string, unknown>)[key] = copyEffects(val as Effect[])
  } else if (key === 'styleRuns') {
    ;(target as Record<string, unknown>)[key] = copyStyleRuns(val as StyleRun[])
  } else {
    ;(target as Record<string, unknown>)[key] = Array.isArray(val) ? structuredClone(val) : val
  }
}

function cloneChildrenWithMapping(
  graph: SceneGraph,
  sourceParentId: string,
  destParentId: string
): void {
  const sourceParent = graph.nodes.get(sourceParentId)
  if (!sourceParent) return

  for (const childId of sourceParent.childIds) {
    const src = graph.nodes.get(childId)
    if (!src) continue

    const { id: _, parentId: _p, childIds: _c, ...rest } = src
    const clone = graph.createNode(src.type, destParentId, {
      ...rest,
      componentId: childId,
      componentLineageId: sourceLineage(src)
    })

    if (src.childIds.length > 0) {
      cloneChildrenWithMapping(graph, childId, clone.id)
    }
  }
}

function syncChildren(
  graph: SceneGraph,
  compParentId: string,
  instParentId: string,
  overrides: Record<string, unknown>
): void {
  const compParent = graph.nodes.get(compParentId)
  const instParent = graph.nodes.get(instParentId)
  if (!compParent || !instParent) return

  const instChildMap = new Map<string, SceneNode>()
  for (const childId of instParent.childIds) {
    const child = graph.nodes.get(childId)
    if (child?.componentId) instChildMap.set(child.componentId, child)
  }

  for (const compChildId of compParent.childIds) {
    if (!instChildMap.has(compChildId)) {
      const src = graph.nodes.get(compChildId)
      if (!src) continue
      const { id: _, parentId: _p, childIds: _c, ...rest } = src
      const clone = graph.createNode(src.type, instParentId, {
        ...rest,
        componentId: compChildId,
        componentLineageId: sourceLineage(src)
      })
      if (src.childIds.length > 0) {
        cloneChildrenWithMapping(graph, compChildId, clone.id)
      }
      instChildMap.set(compChildId, clone)
    }
  }

  for (const compChildId of compParent.childIds) {
    const compChild = graph.nodes.get(compChildId)
    const instChild = instChildMap.get(compChildId)
    if (!compChild || !instChild) continue

    instChild.componentId = compChild.id
    instChild.componentLineageId = sourceLineage(compChild)
    for (const key of INSTANCE_CHILD_SYNC_PROPS) {
      if (hasOverride(overrides, instChild, key)) continue
      copyProp(instChild, compChild, key)
    }

    if (compChild.childIds.length > 0) {
      syncChildren(graph, compChildId, instChild.id, overrides)
    }
  }

  const compChildOrder = compParent.childIds
  instParent.childIds.sort((a, b) => {
    const nodeA = graph.nodes.get(a)
    const nodeB = graph.nodes.get(b)
    const idxA = nodeA?.componentId ? compChildOrder.indexOf(nodeA.componentId) : -1
    const idxB = nodeB?.componentId ? compChildOrder.indexOf(nodeB.componentId) : -1
    return idxA - idxB
  })
}

export function createInstance(
  graph: SceneGraph,
  componentId: string,
  parentId: string,
  overrides: Partial<SceneNode> = {}
): SceneNode | null {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT') return null
  ensureSourceLineage(graph, componentId)

  const props: Partial<SceneNode> = {
    name: component.name,
    componentId,
    componentLineageId: sourceLineage(component)
  }
  for (const key of INSTANCE_SYNC_PROPS) {
    copyProp(props, component, key)
  }

  const instance = graph.createNode('INSTANCE', parentId, { ...props, ...overrides })

  cloneChildrenWithMapping(graph, component.id, instance.id)

  return instance
}

export function populateInstanceChildren(
  graph: SceneGraph,
  instanceId: string,
  componentId: string
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (!instance || !component || instance.type !== 'INSTANCE') return
  ensureSourceLineage(graph, componentId)
  cloneChildrenWithMapping(graph, componentId, instanceId)
}

function reconcileChildren(
  graph: SceneGraph,
  sourceParentId: string,
  instanceParentId: string,
  overrides: Record<string, unknown>
): void {
  const sourceParent = graph.nodes.get(sourceParentId)
  const instanceParent = graph.nodes.get(instanceParentId)
  if (!sourceParent || !instanceParent) return

  const existingByLineage = new Map<string, SceneNode>()
  for (const childId of instanceParent.childIds) {
    const child = graph.nodes.get(childId)
    const lineageId = child?.componentLineageId ?? child?.componentId
    if (child && lineageId) existingByLineage.set(lineageId, child)
  }

  const retainedIds: string[] = []
  for (const sourceChildId of sourceParent.childIds) {
    const sourceChild = graph.nodes.get(sourceChildId)
    if (!sourceChild) continue
    const lineageId = sourceLineage(sourceChild)
    let instanceChild = existingByLineage.get(lineageId)

    if (!instanceChild) {
      const { id: _, parentId: _parent, childIds: _children, ...rest } = sourceChild
      instanceChild = graph.createNode(sourceChild.type, instanceParentId, {
        ...rest,
        componentId: sourceChild.id,
        componentLineageId: lineageId,
        childIds: []
      })
    } else {
      instanceChild.componentId = sourceChild.id
      instanceChild.componentLineageId = lineageId
      for (const key of INSTANCE_CHILD_SYNC_PROPS) {
        if (hasOverride(overrides, instanceChild, key)) continue
        copyProp(instanceChild, sourceChild, key)
      }
    }

    retainedIds.push(instanceChild.id)
    reconcileChildren(graph, sourceChild.id, instanceChild.id, overrides)
  }

  for (const childId of instanceParent.childIds) {
    if (!retainedIds.includes(childId)) graph.deleteNode(childId)
  }
  instanceParent.childIds = retainedIds
}

export function switchInstanceComponent(
  graph: SceneGraph,
  instanceId: string,
  componentId: string
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (instance?.type !== 'INSTANCE' || component?.type !== 'COMPONENT') return

  ensureSourceLineage(graph, componentId)
  graph.updateNode(instanceId, {
    componentId,
    componentLineageId: sourceLineage(component)
  })
  for (const key of INSTANCE_SYNC_PROPS) {
    if (hasOverride(instance.overrides, instance, key)) continue
    copyProp(instance, component, key)
  }
  reconcileChildren(graph, componentId, instanceId, instance.overrides)
}

export function syncInstances(graph: SceneGraph, componentId: string): void {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT') return

  for (const instance of getInstances(graph, componentId)) {
    for (const key of INSTANCE_SYNC_PROPS) {
      if (hasOverride(instance.overrides, instance, key)) continue
      copyProp(instance, component, key)
    }

    syncChildren(graph, component.id, instance.id, instance.overrides)
  }
}

export function detachInstance(graph: SceneGraph, instanceId: string): void {
  const node = graph.nodes.get(instanceId)
  if (node?.type !== 'INSTANCE') return
  if (node.componentId) {
    graph.instanceIndex.get(node.componentId)?.delete(instanceId)
  }
  node.type = 'FRAME'
  node.componentId = null
  node.overrides = {}
}

export function getMainComponent(graph: SceneGraph, instanceId: string): SceneNode | undefined {
  const node = graph.nodes.get(instanceId)
  if (!node?.componentId) return undefined
  return graph.nodes.get(node.componentId)
}

export function getInstances(graph: SceneGraph, componentId: string): SceneNode[] {
  const ids = graph.instanceIndex.get(componentId)
  if (!ids) return []
  const instances: SceneNode[] = []
  for (const id of ids) {
    const node = graph.nodes.get(id)
    if (node) instances.push(node)
  }
  return instances
}
