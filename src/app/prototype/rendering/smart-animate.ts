import type { Fill, SceneNode } from '@nex-design/core/scene-graph'
import type { Color, Vector } from '@nex-design/core/types'

/**
 * Smart animate: layers in the source and destination screens are matched by their name path
 * under the screen (`Card/Title`, duplicates disambiguated by order), like Figma. Each animation
 * frame is a copy of the session nodes where the destination screen's layers are tweened from
 * their matched source layer; unmatched destination layers fade in, and unmatched source layers
 * fade out behind the destination content.
 */

export type NodeMap = ReadonlyMap<string, SceneNode>

export const FADE_OUT_PREFIX = 'smart-out:'

function pathKeys(nodes: NodeMap, rootId: string): Map<string, string> {
  const keys = new Map<string, string>()
  const visit = (nodeId: string, prefix: string) => {
    const node = nodes.get(nodeId)
    if (!node) return
    const seen = new Map<string, number>()
    for (const childId of node.childIds) {
      const child = nodes.get(childId)
      if (!child) continue
      const count = seen.get(child.name) ?? 0
      seen.set(child.name, count + 1)
      const key = `${prefix}/${child.name}#${count}`
      keys.set(key, childId)
      visit(childId, key)
    }
  }
  visit(rootId, '')
  return keys
}

/** Destination layer id → matched source layer id. The two screens always match each other. */
export function matchLayers(
  nodes: NodeMap,
  fromRootId: string,
  toRootId: string
): Map<string, string> {
  const from = pathKeys(nodes, fromRootId)
  const matches = new Map<string, string>([[toRootId, fromRootId]])
  for (const [key, toId] of pathKeys(nodes, toRootId)) {
    const fromId = from.get(key)
    const a = fromId ? nodes.get(fromId) : undefined
    const b = nodes.get(toId)
    if (a && b && a.type === b.type) matches.set(toId, a.id)
  }
  return matches
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function lerpColor(a: Color, b: Color, t: number): Color {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t) }
}

function lerpFills(from: Fill[], to: Fill[], t: number): Fill[] {
  if (from.length !== to.length) return to
  return to.map((fill, i) => {
    const source = from[i]
    if (fill.type !== 'SOLID' || source.type !== 'SOLID') return fill
    return {
      ...fill,
      color: lerpColor(source.color, fill.color, t),
      opacity: lerp(source.opacity, fill.opacity, t)
    }
  })
}

/** Position of `nodeId` relative to the screen `rootId` (the screen itself is at 0,0). */
function screenOffset(nodes: NodeMap, rootId: string, nodeId: string): Vector {
  let x = 0
  let y = 0
  let current = nodes.get(nodeId)
  while (current && current.id !== rootId) {
    x += current.x
    y += current.y
    current = current.parentId ? nodes.get(current.parentId) : undefined
  }
  return { x, y }
}

function tween(from: SceneNode, to: SceneNode, t: number): Partial<SceneNode> {
  return {
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
    rotation: lerp(from.rotation, to.rotation, t),
    opacity: lerp(from.opacity, to.opacity, t),
    cornerRadius: lerp(from.cornerRadius, to.cornerRadius, t),
    fills: lerpFills(from.fills, to.fills, t)
  }
}

/**
 * Node map for animation progress `t` (already eased, 0…1). Only the destination screen's
 * subtree is replaced; everything else is shared with `nodes`.
 */
export function smartAnimateFrame(
  nodes: NodeMap,
  fromRootId: string,
  toRootId: string,
  matches: ReadonlyMap<string, string>,
  t: number
): Map<string, SceneNode> {
  const out = new Map(nodes)
  // Screen-relative position each tweened layer ended up at, so children of a moved parent
  // are placed against the parent's tweened position, not its final one.
  const placed = new Map<string, Vector>([[toRootId, { x: 0, y: 0 }]])

  const visit = (nodeId: string) => {
    const node = nodes.get(nodeId)
    if (!node) return
    const fromId = matches.get(nodeId)
    const from = fromId ? nodes.get(fromId) : undefined
    if (nodeId !== toRootId) {
      const target = screenOffset(nodes, toRootId, nodeId)
      const start = from ? screenOffset(nodes, fromRootId, from.id) : target
      const pos = { x: lerp(start.x, target.x, t), y: lerp(start.y, target.y, t) }
      const parentPos = (node.parentId && placed.get(node.parentId)) || { x: 0, y: 0 }
      placed.set(nodeId, pos)
      out.set(nodeId, {
        ...node,
        ...(from ? tween(from, node, t) : { opacity: node.opacity * t }),
        x: pos.x - parentPos.x,
        y: pos.y - parentPos.y
      })
    } else if (from) {
      out.set(nodeId, { ...node, fills: lerpFills(from.fills, node.fills, t) })
    }
    for (const childId of node.childIds) visit(childId)
  }
  visit(toRootId)
  addFadingSourceLayers(nodes, out, fromRootId, toRootId, matches, t)
  return out
}

/** Source layers with no destination match fade out, drawn behind the destination content. */
function addFadingSourceLayers(
  nodes: NodeMap,
  out: Map<string, SceneNode>,
  fromRootId: string,
  toRootId: string,
  matches: ReadonlyMap<string, string>,
  t: number
) {
  const matchedSources = new Set(matches.values())
  const root = out.get(toRootId)
  const source = nodes.get(fromRootId)
  if (!root || !source || t >= 1) return
  const fading: string[] = []
  const visit = (nodeId: string) => {
    const node = nodes.get(nodeId)
    if (!node) return
    if (!matchedSources.has(nodeId)) {
      const id = `${FADE_OUT_PREFIX}${nodeId}`
      const offset = screenOffset(nodes, fromRootId, nodeId)
      out.set(id, {
        ...node,
        id,
        parentId: toRootId,
        x: offset.x,
        y: offset.y,
        opacity: node.opacity * (1 - t)
      })
      fading.push(id)
      return // the whole unmatched subtree fades with it
    }
    for (const childId of node.childIds) visit(childId)
  }
  for (const childId of source.childIds) visit(childId)
  if (fading.length > 0) out.set(toRootId, { ...root, childIds: [...fading, ...root.childIds] })
}
