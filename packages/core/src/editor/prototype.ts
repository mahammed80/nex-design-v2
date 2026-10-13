import {
  PrototypeGraph,
  moveNavigationReaction,
  removeNavigationReaction,
  restorePrototypeState,
  setReactionDestination,
  snapshotPrototypeState,
  syncConnectionsFromReactions
} from '#core/prototype'
import type {
  ConnectionAnchor,
  ConnectionEndpoint,
  PrototypeConnection,
  PrototypeStateSnapshot
} from '#core/prototype'
import type { Action, PrototypeFlow, Reaction, SceneNode } from '#core/scene-graph'

import type { EditorContext } from './types'

function pageIdForNode(ctx: EditorContext, nodeId: string): string | null {
  return PrototypeGraph.pageIdForNode(ctx.graph, nodeId)
}

function syncNodePage(ctx: EditorContext, nodeId: string): void {
  const pageId = pageIdForNode(ctx, nodeId)
  if (pageId) syncConnectionsFromReactions(ctx.graph, pageId)
}

function withPrototypeUndo(
  ctx: EditorContext,
  pageId: string,
  label: string,
  mutate: () => void
): void {
  const before = snapshotPrototypeState(ctx.graph, pageId)
  mutate()
  syncConnectionsFromReactions(ctx.graph, pageId)
  const after = snapshotPrototypeState(ctx.graph, pageId)
  ctx.undo.push({
    label,
    forward: () => {
      restorePrototypeState(ctx.graph, pageId, after)
      ctx.requestRender()
    },
    inverse: () => {
      restorePrototypeState(ctx.graph, pageId, before)
      ctx.requestRender()
    }
  })
  ctx.requestRender()
}

function findConnection(
  ctx: EditorContext,
  connectionId: string
): { pageId: string; connection: PrototypeConnection } | null {
  for (const page of ctx.graph.getPages()) {
    const connections = page.prototypeConnections ?? []
    const connection = connections.find((c) => c.id === connectionId)
    if (connection) return { pageId: page.id, connection }
  }
  return null
}

function updateConnectionObject(
  ctx: EditorContext,
  pageId: string,
  connectionId: string,
  changes: Partial<PrototypeConnection>
): PrototypeConnection | null {
  const page = ctx.graph.getNode(pageId)
  if (page?.type !== 'CANVAS') return null
  const connections = page.prototypeConnections ?? []
  const index = connections.findIndex((c) => c.id === connectionId)
  if (index === -1) return null
  const updated: PrototypeConnection = { ...connections[index], ...changes }
  connections[index] = updated
  ctx.graph.updateNode(pageId, { prototypeConnections: [...connections] })
  return updated
}

/** Copy an action so stored reactions never share nested objects with caller state. */
function copyAction(action: Action): Action {
  return {
    ...action,
    transition: action.transition ? { ...action.transition } : undefined,
    overlay: action.overlay ? { ...action.overlay } : undefined,
    variantProperties: action.variantProperties ? { ...action.variantProperties } : undefined
  }
}

export function createPrototypeActions(ctx: EditorContext) {
  /** Mutate a node's reactions as one undoable step (falls back to a plain write off-page). */
  function mutateReactions(
    nodeId: string,
    label: string,
    next: (current: Reaction[]) => Reaction[]
  ) {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const write = () => ctx.graph.updateNode(nodeId, { reactions: next(node.reactions ?? []) })
    const pageId = pageIdForNode(ctx, nodeId)
    if (pageId) {
      withPrototypeUndo(ctx, pageId, label, write)
      return
    }
    write()
    syncNodePage(ctx, nodeId)
    ctx.requestRender()
  }

  function addReaction(nodeId: string, reaction: Reaction) {
    mutateReactions(nodeId, 'Add interaction', (current) => [
      ...current,
      { trigger: { ...reaction.trigger }, actions: reaction.actions.map(copyAction) }
    ])
  }

  function removeReaction(nodeId: string, index: number) {
    const node = ctx.graph.getNode(nodeId)
    if (!node?.reactions || index < 0 || index >= node.reactions.length) return
    mutateReactions(nodeId, 'Remove interaction', (current) =>
      current.filter((_, i) => i !== index)
    )
  }

  function updateReaction(nodeId: string, index: number, updates: Partial<Reaction>) {
    const node = ctx.graph.getNode(nodeId)
    if (!node?.reactions || index < 0 || index >= node.reactions.length) return
    mutateReactions(nodeId, 'Edit interaction', (current) =>
      current.map((r, i) =>
        i === index
          ? {
              ...r,
              // A provided trigger replaces the old one, so switching type drops stale
              // delay / keys / direction fields.
              trigger: updates.trigger ? { ...updates.trigger } : r.trigger,
              actions: (updates.actions ?? r.actions).map(copyAction)
            }
          : r
      )
    )
  }

  /** Replace a page's flows as one undo step (flows are small; snapshot the whole list). */
  function mutateFlows(
    pageId: string,
    label: string,
    next: (flows: PrototypeFlow[]) => PrototypeFlow[]
  ) {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return
    const before = structuredClone(page.prototypeFlows ?? [])
    const after = next(structuredClone(before))
    const apply = (flows: PrototypeFlow[]) => {
      ctx.graph.updateNode(pageId, { prototypeFlows: structuredClone(flows) })
      ctx.requestRender()
    }
    apply(after)
    ctx.undo.push({ label, forward: () => apply(after), inverse: () => apply(before) })
  }

  /** Add a named flow starting at `nodeId` (a top-level frame). Returns the flow name used. */
  function addFlow(pageId: string, nodeId: string, name?: string): string | null {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS' || !ctx.graph.getNode(nodeId)) return null
    const existing = page.prototypeFlows ?? []
    if (existing.some((flow) => flow.startNodeId === nodeId)) return null
    const flowName = name?.trim() || `Flow ${existing.length + 1}`
    mutateFlows(pageId, 'Add flow', (flows) => [...flows, { name: flowName, startNodeId: nodeId }])
    return flowName
  }

  function removeFlow(pageId: string, startNodeId: string) {
    mutateFlows(pageId, 'Remove flow', (flows) =>
      flows.filter((flow) => flow.startNodeId !== startNodeId)
    )
  }

  function updateFlow(
    pageId: string,
    startNodeId: string,
    changes: Partial<Pick<PrototypeFlow, 'name' | 'description'>>
  ) {
    mutateFlows(pageId, 'Edit flow', (flows) =>
      flows.map((flow) => (flow.startNodeId === startNodeId ? { ...flow, ...changes } : flow))
    )
  }

  function setPrototypeStartNode(pageId: string, nodeId: string | null) {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return
    const before = page.prototypeStartNodeId ?? null
    if (before === nodeId) return
    const apply = (value: string | null) => {
      ctx.graph.updateNode(pageId, { prototypeStartNodeId: value })
      ctx.requestRender()
    }
    apply(nodeId)
    ctx.undo.push({
      label: 'Set flow starting point',
      forward: () => apply(nodeId),
      inverse: () => apply(before)
    })
  }

  function addConnection(
    sourceNodeId: string,
    targetNodeId: string,
    triggerType: Reaction['trigger']['type'] = 'ON_CLICK'
  ) {
    const source = ctx.graph.getNode(sourceNodeId)
    const target = ctx.graph.getNode(targetNodeId)
    if (!source || !target || sourceNodeId === targetNodeId) return
    const pageId = pageIdForNode(ctx, sourceNodeId)
    if (!pageId) return

    withPrototypeUndo(ctx, pageId, 'Add prototype connection', () => {
      ctx.graph.updateNode(sourceNodeId, {
        reactions: [
          ...(source.reactions ?? []),
          {
            trigger: { type: triggerType },
            actions: [{ type: 'NAVIGATE', destinationId: targetNodeId }]
          }
        ]
      })
    })
  }

  function removeConnection(connectionId: string) {
    const connections = findConnection(ctx, connectionId)
    if (!connections) return
    const { pageId, connection } = connections
    withPrototypeUndo(ctx, pageId, 'Delete prototype connection', () => {
      removeNavigationReaction(ctx.graph, connection.sourceNodeId, connection.triggerType)
      const page = ctx.graph.getNode(pageId)
      if (page?.type === 'CANVAS') {
        const next = (page.prototypeConnections ?? []).filter((c) => c.id !== connectionId)
        ctx.graph.updateNode(pageId, { prototypeConnections: next })
      }
    })
  }

  /**
   * Reconnect one end of a connection to a different node. Passing `null` for
   * `nodeId` re-anchors the endpoint to its current node's auto anchor.
   */
  function reconnectConnection(
    connectionId: string,
    endpoint: ConnectionEndpoint,
    nodeId: string,
    anchor: ConnectionAnchor | null = null
  ) {
    const found = findConnection(ctx, connectionId)
    if (!found) return
    const { pageId, connection } = found
    const node = ctx.graph.getNode(nodeId)
    if (!node) return

    withPrototypeUndo(ctx, pageId, 'Reconnect prototype connection', () => {
      if (endpoint === 'target') {
        setReactionDestination(ctx.graph, connection.sourceNodeId, connection.triggerType, nodeId)
        updateConnectionObject(ctx, pageId, connectionId, {
          targetNodeId: nodeId,
          targetAnchor: anchor
        })
      } else {
        moveNavigationReaction(ctx.graph, connection.sourceNodeId, connection.triggerType, nodeId)
        updateConnectionObject(ctx, pageId, connectionId, {
          sourceNodeId: nodeId,
          sourceAnchor: anchor
        })
      }
    })
  }

  function updateConnectionGeometry(
    connectionId: string,
    changes: Partial<
      Pick<
        PrototypeConnection,
        'sourceAnchor' | 'targetAnchor' | 'routing' | 'curvature' | 'customControlPoints'
      >
    >
  ) {
    const found = findConnection(ctx, connectionId)
    if (!found) return
    const { pageId } = found
    const updated = updateConnectionObject(ctx, pageId, connectionId, changes)
    if (!updated) return
    ctx.requestRender()
  }

  function commitConnectionGeometry(connectionId: string, before: PrototypeStateSnapshot) {
    const found = findConnection(ctx, connectionId)
    if (!found) return
    const { pageId } = found
    const after = snapshotPrototypeState(ctx.graph, pageId)
    ctx.undo.push({
      label: 'Edit prototype connection',
      forward: () => {
        restorePrototypeState(ctx.graph, pageId, after)
        ctx.requestRender()
      },
      inverse: () => {
        restorePrototypeState(ctx.graph, pageId, before)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  /** Resolve the source node + reaction a connection visualizes. */
  function connectionReaction(connectionId: string): {
    node: SceneNode
    reaction: Reaction
    index: number
  } | null {
    const pageId = ctx.state.currentPageId
    const pageNode = ctx.graph.getNode(pageId)
    if (pageNode?.type !== 'CANVAS') return null
    const conn = (pageNode.prototypeConnections ?? []).find((c) => c.id === connectionId)
    if (!conn) return null
    const source = ctx.graph.getNode(conn.sourceNodeId)
    if (!source?.reactions) return null
    const index = source.reactions.findIndex(
      (r) =>
        r.trigger.type === conn.triggerType &&
        r.actions.some((a) => a.destinationId === conn.targetNodeId)
    )
    if (index === -1) return null
    return { node: source, reaction: source.reactions[index], index }
  }

  return {
    addReaction,
    removeReaction,
    updateReaction,
    addFlow,
    removeFlow,
    updateFlow,
    setPrototypeStartNode,
    addConnection,
    removeConnection,
    reconnectConnection,
    updateConnectionGeometry,
    commitConnectionGeometry,
    connectionReaction
  }
}
