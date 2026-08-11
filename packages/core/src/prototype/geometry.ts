import type { Rect, Vector } from '#core/types'

import { DEFAULT_CONNECTION_CURVATURE } from './types'
import type { ConnectionAnchor, ConnectionSide, PrototypeConnection } from './types'

export type ConnectionGeometry =
  | { kind: 'cubic'; p0: Vector; cp1: Vector; cp2: Vector; p1: Vector }
  | { kind: 'polyline'; points: Vector[] }

const CUBIC_SAMPLES = 24

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function lerp(a: Vector, b: Vector, t: number): Vector {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function hypot(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy)
}

function sideNormal(side: ConnectionSide): Vector {
  switch (side) {
    case 'RIGHT':
      return { x: 1, y: 0 }
    case 'LEFT':
      return { x: -1, y: 0 }
    case 'BOTTOM':
      return { x: 0, y: 1 }
    case 'TOP':
      return { x: 0, y: -1 }
    default:
      return { x: 1, y: 0 }
  }
}

export function anchorPoint(
  bounds: Rect,
  side: ConnectionSide,
  offset: number,
  margin = 0
): Vector {
  const o = clamp01(offset)
  switch (side) {
    case 'LEFT':
      return { x: bounds.x - margin, y: bounds.y + bounds.height * o }
    case 'RIGHT':
      return { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height * o }
    case 'TOP':
      return { x: bounds.x + bounds.width * o, y: bounds.y - margin }
    case 'BOTTOM':
      return { x: bounds.x + bounds.width * o, y: bounds.y + bounds.height + margin }
    default:
      return { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height * o }
  }
}

function centerOf(bounds: Rect): Vector {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

/**
 * Pick the two facing sides that connect the source and target bounds, with
 * offsets that align the anchor points roughly through the two node centers.
 */
export function autoAnchors(
  sourceBounds: Rect,
  targetBounds: Rect
): {
  sourceAnchor: ConnectionAnchor
  targetAnchor: ConnectionAnchor
} {
  const sc = centerOf(sourceBounds)
  const tc = centerOf(targetBounds)
  const dx = tc.x - sc.x
  const dy = tc.y - sc.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sourceSide: ConnectionSide = dx >= 0 ? 'RIGHT' : 'LEFT'
    const targetSide: ConnectionSide = dx >= 0 ? 'LEFT' : 'RIGHT'
    return {
      sourceAnchor: {
        side: sourceSide,
        offset: clamp01((tc.y - sourceBounds.y) / (sourceBounds.height || 1))
      },
      targetAnchor: {
        side: targetSide,
        offset: clamp01((sc.y - targetBounds.y) / (targetBounds.height || 1))
      }
    }
  }

  const sourceSide: ConnectionSide = dy >= 0 ? 'BOTTOM' : 'TOP'
  const targetSide: ConnectionSide = dy >= 0 ? 'TOP' : 'BOTTOM'
  return {
    sourceAnchor: {
      side: sourceSide,
      offset: clamp01((tc.x - sourceBounds.x) / (sourceBounds.width || 1))
    },
    targetAnchor: {
      side: targetSide,
      offset: clamp01((sc.x - targetBounds.x) / (targetBounds.width || 1))
    }
  }
}

export function buildConnectionGeometry(
  conn: PrototypeConnection,
  sourceAnchor: ConnectionAnchor,
  targetAnchor: ConnectionAnchor,
  sourcePoint: Vector,
  targetPoint: Vector
): ConnectionGeometry {
  if (conn.routing === 'ELBOW') {
    const mx = (sourcePoint.x + targetPoint.x) / 2
    return {
      kind: 'polyline',
      points: [sourcePoint, { x: mx, y: sourcePoint.y }, { x: mx, y: targetPoint.y }, targetPoint]
    }
  }

  if (conn.routing === 'STRAIGHT') {
    return {
      kind: 'cubic',
      p0: sourcePoint,
      cp1: lerp(sourcePoint, targetPoint, 1 / 3),
      cp2: lerp(sourcePoint, targetPoint, 2 / 3),
      p1: targetPoint
    }
  }

  const curvature =
    typeof conn.curvature === 'number' ? conn.curvature : DEFAULT_CONNECTION_CURVATURE
  const dist = Math.max(60, hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y))
  const spacing = dist * curvature
  const n1 = sideNormal(sourceAnchor.side)
  const n2 = sideNormal(targetAnchor.side)
  const defaultCp1 = { x: sourcePoint.x + n1.x * spacing, y: sourcePoint.y + n1.y * spacing }
  const defaultCp2 = { x: targetPoint.x + n2.x * spacing, y: targetPoint.y + n2.y * spacing }
  const custom = conn.customControlPoints
  return {
    kind: 'cubic',
    p0: sourcePoint,
    cp1: custom?.[0] ?? defaultCp1,
    cp2: custom?.[1] ?? defaultCp2,
    p1: targetPoint
  }
}

function cubicPoint(g: ConnectionGeometry, t: number): Vector {
  if (g.kind !== 'cubic') return g.points[0]
  const { p0, cp1, cp2, p1 } = g
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * cp1.x + 3 * u * t * t * cp2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * cp1.y + 3 * u * t * t * cp2.y + t * t * t * p1.y
  }
}

function distanceToSegment(p: Vector, a: Vector, b: Vector): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq
  t = clamp01(t)
  return hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t))
}

/** Minimum distance from a point to a connection geometry. */
export function distanceToGeometry(p: Vector, g: ConnectionGeometry): number {
  if (g.kind === 'polyline') {
    let min = Infinity
    for (let i = 0; i < g.points.length - 1; i++) {
      min = Math.min(min, distanceToSegment(p, g.points[i], g.points[i + 1]))
    }
    return min
  }
  let min = Infinity
  for (let i = 0; i <= CUBIC_SAMPLES; i++) {
    const q = cubicPoint(g, i / CUBIC_SAMPLES)
    min = Math.min(min, hypot(p.x - q.x, p.y - q.y))
  }
  return min
}

/** Unit vector pointing into the target, used to orient the arrowhead. */
export function arrowDirection(g: ConnectionGeometry): Vector {
  if (g.kind === 'polyline') {
    const a = g.points[g.points.length - 2]
    const b = g.points[g.points.length - 1]
    const len = hypot(b.x - a.x, b.y - a.y) || 1
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  }
  const tail = cubicPoint(g, 1)
  const near = cubicPoint(g, 1 - 0.08)
  const len = hypot(tail.x - near.x, tail.y - near.y) || 1
  return { x: (tail.x - near.x) / len, y: (tail.y - near.y) / len }
}
