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
import type { Reaction, SceneNode } from '#core/scene-graph'

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

export function createPrototypeActions(ctx: EditorContext) {
  function addReaction(nodeId: string, reaction: Reaction) {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const reactions = node.reactions ? [...node.reactions, reaction] : [reaction]
    ctx.graph.updateNode(nodeId, { reactions })
    syncNodePage(ctx, nodeId)
    ctx.requestRender()
  }

  function removeReaction(nodeId: string, index: number) {
    const node = ctx.graph.getNode(nodeId)
    if (!node?.reactions || index < 0 || index >= node.reactions.length) return
    const reactions = [...node.reactions]
    reactions.splice(index, 1)
    ctx.graph.updateNode(nodeId, { reactions })
    syncNodePage(ctx, nodeId)
    ctx.requestRender()
  }

  function updateReaction(nodeId: string, index: number, updates: Partial<Reaction>) {
    const node = ctx.graph.getNode(nodeId)
    if (!node?.reactions || index < 0 || index >= node.reactions.length) return
    const reactions = node.reactions.map((r, i) => {
      if (i === index) {
        return {
          trigger: { ...r.trigger, ...updates.trigger },
          actions: updates.actions
            ? updates.actions.map((a) => ({
                ...a,
                transition: a.transition ? { ...a.transition } : undefined
              }))
            : r.actions
        }
      }
      return r
    })
    ctx.graph.updateNode(nodeId, { reactions })
    syncNodePage(ctx, nodeId)
    ctx.requestRender()
  }

  function setPrototypeStartNode(pageId: string, nodeId: string | null) {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return
    ctx.graph.updateNode(pageId, { prototypeStartNodeId: nodeId })
    ctx.requestRender()
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
    setPrototypeStartNode,
    addConnection,
    removeConnection,
    reconnectConnection,
    updateConnectionGeometry,
    commitConnectionGeometry,
    connectionReaction
  }
}
