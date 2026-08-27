/**
 * Offset path: inset (negative) or outset (positive) a vector network
 * by expanding/contracting segment normals by the given amount.
 */
import type { VectorNetwork, VectorVertex } from '#core/scene-graph'
import type { Vector } from '#core/types'

function normalize(v: Vector): Vector {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len < 1e-10) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function segmentNormal(a: Vector, b: Vector): Vector {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return normalize({ x: -dy, y: dx })
}

/**
 * Offset all vertices of a network outward (positive amount)
 * or inward (negative amount) using averaged segment normals.
 */
export function offsetVectorNetwork(
  network: VectorNetwork,
  amount: number
): VectorNetwork {
  if (!network.vertices || network.vertices.length === 0 || amount === 0) return network

  const vertices = network.vertices
  const segments = network.segments

  const adjacency = new Map<number, number[]>()
  for (const seg of segments) {
    if (!adjacency.has(seg.start)) adjacency.set(seg.start, [])
    if (!adjacency.has(seg.end)) adjacency.set(seg.end, [])
    adjacency.get(seg.start)?.push(seg.end)
    adjacency.get(seg.end)?.push(seg.start)
  }

  const newVertices: VectorVertex[] = vertices.map((v, i) => {
    const neighbours = adjacency.get(i) ?? []
    if (neighbours.length === 0) return { ...v }

    const normals = neighbours.map((nIdx) =>
      segmentNormal({ x: v.x, y: v.y }, { x: vertices[nIdx].x, y: vertices[nIdx].y })
    )
    const avg: Vector = normals.reduce(
      (acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }),
      { x: 0, y: 0 }
    )
    const avgNorm = normalize(avg)

    return {
      ...v,
      x: v.x + avgNorm.x * amount,
      y: v.y + avgNorm.y * amount
    }
  })

  return {
    vertices: newVertices,
    segments: network.segments,
    regions: network.regions ?? []
  }
}
