import type { SceneGraph, SceneNode } from './index'

const MAX_TRAVERSAL_DEPTH = 10_000

/**
 * Return the ancestry chain of `nodeId` as an array ordered outermost-first,
 * ending at the node itself. The scope (or the graph root) is excluded.
 *
 * Example for `Frame -> Rectangle -> Text` with `scopeId = pageId`:
 * `[frame, rectangle, text]`.
 */
export function getAncestorStack(graph: SceneGraph, nodeId: string, scopeId?: string): SceneNode[] {
  const scope = scopeId ?? graph.rootId
  const stack: SceneNode[] = []
  let current = graph.getNode(nodeId)
  let guard = 0
  while (current && current.id !== scope && guard < MAX_TRAVERSAL_DEPTH) {
    stack.unshift(current)
    current = current.parentId ? graph.getNode(current.parentId) : undefined
    guard++
  }
  return stack
}

/**
 * Nearest node in the ancestry chain (including the node itself) that is
 * locked, or `null` when none is.
 */
export function findLockedAncestor(graph: SceneGraph, nodeId: string): SceneNode | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.locked) return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

/**
 * Nearest node in the ancestry chain (including the node itself) that is
 * visible, or `null` when none is.
 */
export function findVisibleAncestor(graph: SceneGraph, nodeId: string): SceneNode | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.visible) return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

/**
 * Nearest editable node in the ancestry chain (including the node itself).
 * Text nodes are editable; returns `null` when none is found.
 */
export function findEditableNode(graph: SceneGraph, nodeId: string): SceneNode | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'TEXT') return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

/**
 * Nearest selectable node in the ancestry chain (including the node itself).
 * A node is selectable when it is visible and not locked; returns `null` when
 * none is found.
 */
export function findSelectableNode(graph: SceneGraph, nodeId: string): SceneNode | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.visible && !current.locked) return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}
