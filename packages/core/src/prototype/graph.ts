import type { SceneGraph, SceneNode } from '#core/scene-graph'
import type { Rect, Vector } from '#core/types'

import { anchorPoint, autoAnchors, buildConnectionGeometry, distanceToGeometry } from './geometry'
import { connectionKey } from './types'
import type { ConnectionHit, ConnectionHitPart, ConnectionSide, PrototypeConnection } from './types'

export const CONNECTION_HIT_THRESHOLD = 8
export const ENDPOINT_HIT_THRESHOLD = 10
export const CONTROL_POINT_HIT_THRESHOLD = 10

export function navigationReactionFor(
  node: SceneNode,
  triggerType: string
): NonNullable<SceneNode['reactions']>[number] | null {
  if (!node.reactions) return null
  return (
    node.reactions.find(
      (r) =>
        r.trigger.type === triggerType &&
        r.actions.some((a: any) => a.type === 'NAVIGATE' && a.destinationId)
    ) ?? null
  )
}

function navigationDestination(
  reaction: NonNullable<SceneNode['reactions']>[number]
): string | null {
  return (
    reaction?.actions.find((a: any) => a.type === 'NAVIGATE' && a.destinationId)?.destinationId ??
    null
  )
}

function nodeBounds(graph: SceneGraph, nodeId: string): Rect | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  return graph.getAbsoluteBounds(nodeId)
}

function resolveAnchors(
  graph: SceneGraph,
  conn: PrototypeConnection
): { source: ConnectionSide; target: ConnectionSide } | null {
  const sourceBounds = nodeBounds(graph, conn.sourceNodeId)
  const targetBounds = nodeBounds(graph, conn.targetNodeId)
  if (!sourceBounds || !targetBounds) return null
  const auto = autoAnchors(sourceBounds, targetBounds)
  return {
    source: (conn.sourceAnchor ?? auto.sourceAnchor).side,
    target: (conn.targetAnchor ?? auto.targetAnchor).side
  }
}

/**
 * Read model over the prototype connections stored on a page. Derives the
 * live connection list from the source nodes' NAVIGATE reactions and exposes
 * hit-testing for selection and endpoint/control-point editing.
 */
export class PrototypeGraph {
  constructor(
    private graph: SceneGraph,
    private pageId: string
  ) {}

  private page(): SceneNode | undefined {
    return this.graph.getNode(this.pageId)
  }

  connections(): PrototypeConnection[] {
    const page = this.page()
    const list = page?.prototypeConnections ?? []
    const result: PrototypeConnection[] = []
    for (const conn of list) {
      const source = this.graph.getNode(conn.sourceNodeId)
      if (!source) continue
      const reaction = navigationReactionFor(source, conn.triggerType)
      if (!reaction) continue
      if (navigationDestination(reaction) !== conn.targetNodeId) continue
      result.push(conn)
    }
    return result
  }

  connectionById(id: string): PrototypeConnection | undefined {
    return this.connections().find((c) => c.id === id)
  }

  outgoing(sourceNodeId: string): PrototypeConnection[] {
    return this.connections().filter((c) => c.sourceNodeId === sourceNodeId)
  }

  incoming(targetNodeId: string): PrototypeConnection[] {
    return this.connections().filter((c) => c.targetNodeId === targetNodeId)
  }

  connectionKeySet(): Set<string> {
    return new Set(this.connections().map((c) => connectionKey(c)))
  }

  /** Resolved geometry for a connection in world coordinates. */
  geometry(conn: PrototypeConnection) {
    const sourceBounds = nodeBounds(this.graph, conn.sourceNodeId)
    const targetBounds = nodeBounds(this.graph, conn.targetNodeId)
    if (!sourceBounds || !targetBounds) return null
    const auto = autoAnchors(sourceBounds, targetBounds)
    const sourceAnchor = conn.sourceAnchor ?? auto.sourceAnchor
    const targetAnchor = conn.targetAnchor ?? auto.targetAnchor
    const sourcePoint = anchorPoint(sourceBounds, sourceAnchor.side, sourceAnchor.offset)
    const targetPoint = anchorPoint(targetBounds, targetAnchor.side, targetAnchor.offset)
    return buildConnectionGeometry(conn, sourceAnchor, targetAnchor, sourcePoint, targetPoint)
  }

  endpointPoint(conn: PrototypeConnection, endpoint: 'source' | 'target'): Vector | null {
    const geom = this.geometry(conn)
    if (!geom) return null
    if (endpoint === 'source') {
      return geom.kind === 'cubic' ? geom.p0 : geom.points[0]
    } else {
      return geom.kind === 'cubic' ? geom.p1 : geom.points[geom.points.length - 1]
    }
  }

  controlPoints(conn: PrototypeConnection): [Vector | null, Vector | null] {
    const g = this.geometry(conn)
    if (!g || g.kind !== 'cubic') return [null, null]
    return [g.cp1, g.cp2]
  }

  /**
   * Hit-test connections at a world-space point. Endpoint and control-point
   * handles take priority over the connection body.
   */
  hitTestAtPoint(
    px: number,
    py: number,
    threshold = CONNECTION_HIT_THRESHOLD
  ): ConnectionHit | null {
    const point = { x: px, y: py }
    const connections = this.connections()
    let best: ConnectionHit | null = null
    let bestDistance = Infinity

    for (const conn of connections) {
      const sourcePoint = this.endpointPoint(conn, 'source')
      if (sourcePoint) {
        const d = Math.hypot(px - sourcePoint.x, py - sourcePoint.y)
        if (d <= ENDPOINT_HIT_THRESHOLD && d < bestDistance) {
          best = { connection: conn, part: 'source' }
          bestDistance = d
        }
      }
      const targetPoint = this.endpointPoint(conn, 'target')
      if (targetPoint) {
        const d = Math.hypot(px - targetPoint.x, py - targetPoint.y)
        if (d <= ENDPOINT_HIT_THRESHOLD && d < bestDistance) {
          best = { connection: conn, part: 'target' }
          bestDistance = d
        }
      }

      const controls = this.controlPoints(conn)
      for (let i = 0; i < controls.length; i++) {
        const cp = controls[i]
        if (!cp) continue
        const d = Math.hypot(px - cp.x, py - cp.y)
        if (d <= CONTROL_POINT_HIT_THRESHOLD && d < bestDistance) {
          best = { connection: conn, part: 'control', controlIndex: i }
          bestDistance = d
        }
      }

      const geometry = this.geometry(conn)
      if (!geometry) continue
      const d = distanceToGeometry(point, geometry)
      if (d <= threshold && d < bestDistance) {
        best = { connection: conn, part: 'body' }
        bestDistance = d
      }
    }

    return best
  }

  /** Anchor side of a connection endpoint, resolved to its node's edge. */
  endpointSide(conn: PrototypeConnection, endpoint: 'source' | 'target'): ConnectionSide {
    const resolved = resolveAnchors(this.graph, conn)
    return endpoint === 'source' ? (resolved?.source ?? 'RIGHT') : (resolved?.target ?? 'LEFT')
  }

  /** The page node id for a node, walking up to the containing CANVAS. */
  static pageIdForNode(graph: SceneGraph, nodeId: string): string | null {
    let current = graph.getNode(nodeId)
    while (current) {
      if (current.type === 'CANVAS') return current.id
      current = current.parentId ? graph.getNode(current.parentId) : undefined
    }
    return null
  }
}

export type { ConnectionHitPart }
