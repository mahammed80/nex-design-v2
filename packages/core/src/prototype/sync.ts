import type { Reaction, SceneGraph } from '#core/scene-graph'

import { navigationReactionFor } from './graph'
import { connectionKey, createConnection } from './types'
import type { PrototypeConnection } from './types'

export interface PrototypeStateSnapshot {
  connections: PrototypeConnection[]
  reactions: Map<string, Reaction[]>
}

/**
 * Reconcile the page's stored connections against the reactions present on
 * its nodes. Connections are created for every NAVIGATE reaction that does
 * not yet have one (matched by source+destination+trigger) and removed when
 * their reaction disappears. Existing connection geometry is preserved.
 *
 * Mutates the page node directly so callers stay in control of render/undo.
 */
export function syncConnectionsFromReactions(graph: SceneGraph, pageId: string): void {
  const page = graph.getNode(pageId)
  if (page?.type !== 'CANVAS') return

  const existing = page.prototypeConnections ?? []
  const existingByKey = new Map(existing.map((c) => [connectionKey(c), c]))
  const next: PrototypeConnection[] = []

  const collect = (nodeId: string) => {
    const node = graph.getNode(nodeId)
    if (!node) return
    if (node.reactions) {
      for (const reaction of node.reactions) {
        const action = reaction.actions.find((a) => !!a.destinationId)
        if (!action?.destinationId) continue
        const key = connectionKey({
          sourceNodeId: node.id,
          targetNodeId: action.destinationId,
          triggerType: reaction.trigger.type
        })
        const previous = existingByKey.get(key)
        next.push(
          previous
            ? {
                ...previous,
                sourceNodeId: node.id,
                targetNodeId: action.destinationId,
                triggerType: reaction.trigger.type
              }
            : createConnection(node.id, action.destinationId, reaction.trigger.type)
        )
      }
    }
    for (const childId of node.childIds) collect(childId)
  }

  for (const childId of page.childIds) collect(childId)

  graph.updateNode(pageId, { prototypeConnections: next })
}

/** Update the destination of a source node's reaction. */
export function setReactionDestination(
  graph: SceneGraph,
  sourceNodeId: string,
  triggerType: string,
  destinationId: string
): void {
  const source = graph.getNode(sourceNodeId)
  if (!source?.reactions) return
  const reactions = source.reactions.map((r) => {
    if (r.trigger.type !== triggerType) return r
    return {
      ...r,
      actions: r.actions.map((a) => (a.destinationId ? { ...a, destinationId } : a))
    }
  })
  graph.updateNode(sourceNodeId, { reactions })
}

/** Move a source node's reaction to a different node. */
export function moveNavigationReaction(
  graph: SceneGraph,
  fromNodeId: string,
  triggerType: string,
  toNodeId: string
): void {
  const from = graph.getNode(fromNodeId)
  const to = graph.getNode(toNodeId)
  if (!from || !to || from.id === to.id) return
  const reaction = navigationReactionFor(from, triggerType)
  if (!reaction) return
  graph.updateNode(fromNodeId, {
    reactions: (from.reactions ?? []).filter((r) => r !== reaction)
  })
  graph.updateNode(toNodeId, {
    reactions: [...(to.reactions ?? []), reaction]
  })
}

/** Remove a source node's reaction entirely. */
export function removeNavigationReaction(
  graph: SceneGraph,
  sourceNodeId: string,
  triggerType: string
): void {
  const source = graph.getNode(sourceNodeId)
  if (!source?.reactions) return
  const reactions = source.reactions.filter((r) => {
    if (r.trigger.type !== triggerType) return true
    return !r.actions.some((a) => !!a.destinationId)
  })
  graph.updateNode(sourceNodeId, { reactions })
}

/** Snapshot connections + affected reactions for undo/redo. */
export function snapshotPrototypeState(graph: SceneGraph, pageId: string): PrototypeStateSnapshot {
  const page = graph.getNode(pageId)
  const connections = page?.type === 'CANVAS' ? [...(page.prototypeConnections ?? [])] : []
  const reactions = new Map<string, Reaction[]>()
  const collect = (nodeId: string) => {
    const node = graph.getNode(nodeId)
    if (!node) return
    if (node.reactions?.length)
      reactions.set(
        node.id,
        node.reactions.map((r) => structuredClone(r))
      )
    for (const childId of node.childIds) collect(childId)
  }
  for (const childId of page?.childIds ?? []) collect(childId)
  return { connections, reactions }
}

/** Restore a snapshot from undo/redo. */
export function restorePrototypeState(
  graph: SceneGraph,
  pageId: string,
  snapshot: PrototypeStateSnapshot
): void {
  const page = graph.getNode(pageId)
  if (page?.type !== 'CANVAS') return
  graph.updateNode(pageId, {
    prototypeConnections: snapshot.connections.map((c) => structuredClone(c))
  })
  for (const [nodeId, reactions] of snapshot.reactions) {
    const node = graph.getNode(nodeId)
    if (node) {
      graph.updateNode(nodeId, {
        reactions: reactions.map((r) => structuredClone(r))
      })
    }
  }
  // Reactions removed by the snapshot (deleted nodes) must be cleared.
  const snapshotNodes = new Set(snapshot.reactions.keys())
  const collect = (nodeId: string) => {
    const node = graph.getNode(nodeId)
    if (!node) return
    if (node.reactions?.length && !snapshotNodes.has(node.id)) {
      graph.updateNode(node.id, { reactions: [] })
    }
    for (const childId of node.childIds) collect(childId)
  }
  for (const childId of page.childIds) collect(childId)
}
