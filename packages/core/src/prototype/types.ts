import { randomHex } from '#core/random'
import type { Vector } from '#core/types'

export type ConnectionSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'
export type ConnectionRouting = 'AUTO' | 'STRAIGHT' | 'ELBOW'
export type ConnectionEndpoint = 'source' | 'target'

export interface ConnectionAnchor {
  side: ConnectionSide
  offset: number
}

/**
 * A first-class prototype connection between two scene nodes. Stored on the
 * page (CANVAS) node in `prototypeConnections` and kept in sync with the
 * source node's NAVIGATE reaction. Visual geometry (anchors, curvature,
 * control points) lives here; trigger/action/transition live on the reaction.
 */
export interface PrototypeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  triggerType: string
  sourceAnchor: ConnectionAnchor | null
  targetAnchor: ConnectionAnchor | null
  routing: ConnectionRouting
  curvature: number
  customControlPoints: [Vector | null, Vector | null] | null
}

export type ConnectionHitPart = 'body' | 'source' | 'target' | 'control'

export interface ConnectionHit {
  connection: PrototypeConnection
  part: ConnectionHitPart
  controlIndex?: number
}

export const CONNECTION_ID_PREFIX = 'proto:'

export const DEFAULT_CONNECTION_CURVATURE = 0.4

export function isConnectionId(id: string): boolean {
  return id.startsWith(CONNECTION_ID_PREFIX)
}

export function makeConnectionId(): string {
  return `${CONNECTION_ID_PREFIX}${randomHex(8)}`
}

export function connectionKey(conn: {
  sourceNodeId: string
  targetNodeId: string
  triggerType: string
}): string {
  return `${conn.sourceNodeId}|${conn.targetNodeId}|${conn.triggerType}`
}

export function createConnection(
  sourceNodeId: string,
  targetNodeId: string,
  triggerType: string
): PrototypeConnection {
  return {
    id: makeConnectionId(),
    sourceNodeId,
    targetNodeId,
    triggerType,
    sourceAnchor: null,
    targetAnchor: null,
    routing: 'AUTO',
    curvature: DEFAULT_CONNECTION_CURVATURE,
    customControlPoints: null
  }
}
