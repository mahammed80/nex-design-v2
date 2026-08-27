import type { VectorNetwork, VectorSegment, VectorVertex } from '#core/scene-graph'
import type { Vector } from '#core/types'

function perpendicularDistance(
  p: Vector,
  a1: Vector,
  a2: Vector
): number {
  const dx = a2.x - a1.x
  const dy = a2.y - a1.y
  if (dx === 0 && dy === 0) {
    return Math.sqrt((p.x - a1.x) ** 2 + (p.y - a1.y) ** 2)
  }
  const num = Math.abs(dy * p.x - dx * p.y + a2.x * a1.y - a2.y * a1.x)
  const den = Math.sqrt(dx ** 2 + dy ** 2)
  return num / den
}

function rdpReduce(
  points: Vector[],
  epsilon: number
): Vector[] {
  if (points.length <= 2) return points

  let maxDist = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > maxDist) {
      index = i
      maxDist = d
    }
  }

  if (maxDist > epsilon) {
    const result1 = rdpReduce(points.slice(0, index + 1), epsilon)
    const result2 = rdpReduce(points.slice(index), epsilon)
    return [...result1.slice(0, -1), ...result2]
  } else {
    return [points[0], points[end]]
  }
}

export function simplifyVectorNetwork(
  network: VectorNetwork,
  epsilon = 1.0
): VectorNetwork {
  if (!network.vertices || network.vertices.length <= 2) {
    return network
  }

  const points = network.vertices.map((v) => ({ x: v.x, y: v.y }))
  const simplifiedPoints = rdpReduce(points, epsilon)

  if (simplifiedPoints.length === points.length) {
    return network
  }


  const newVertices: VectorVertex[] = simplifiedPoints.map((p) => ({
    x: p.x,
    y: p.y,
    strokeCap: 'NONE',
    strokeJoin: 'MITER'
  }))

  const newSegments: VectorSegment[] = []
  for (let i = 0; i < newVertices.length - 1; i++) {
    newSegments.push({
      start: i,
      end: i + 1,
      tangentStart: { x: 0, y: 0 },
      tangentEnd: { x: 0, y: 0 }
    })
  }

  return {
    vertices: newVertices,
    segments: newSegments,
    regions: network.regions ?? []
  }
}
