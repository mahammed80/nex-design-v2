/**
 * outlineStroke: Convert stroke properties of a node into a filled VectorNetwork.
 * Analogous to Figma's "Outline Stroke" command.
 *
 * Implementation strategy: expand each segment into two parallel offset segments
 * (one on either side of the original path), then connect their endpoints.
 */
import type { VectorNetwork, VectorVertex, VectorSegment } from '#core/scene-graph'
import type { Vector } from '#core/types'

function normalize(v: Vector): Vector {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len < 1e-10) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

/**
 * Convert stroke weight into an outlined (filled) VectorNetwork by
 * offsetting each segment's normal by half the stroke weight.
 */
export function outlineStrokeNetwork(
  network: VectorNetwork,
  strokeWeight: number
): VectorNetwork {
  if (!network.vertices || network.segments.length === 0 || strokeWeight <= 0) {
    return network
  }

  const half = strokeWeight / 2
  const vertices: VectorVertex[] = []
  const segments: VectorSegment[] = []

  for (const seg of network.segments) {
    const a = network.vertices[seg.start]
    const b = network.vertices[seg.end]

    const dx = b.x - a.x
    const dy = b.y - a.y
    const n = normalize({ x: -dy, y: dx })

    const base = vertices.length

    // left side (a->b offset +n)
    vertices.push({ x: a.x + n.x * half, y: a.y + n.y * half, strokeCap: 'NONE', strokeJoin: 'MITER' })
    vertices.push({ x: b.x + n.x * half, y: b.y + n.y * half, strokeCap: 'NONE', strokeJoin: 'MITER' })
    // right side (b->a offset -n)
    vertices.push({ x: b.x - n.x * half, y: b.y - n.y * half, strokeCap: 'NONE', strokeJoin: 'MITER' })
    vertices.push({ x: a.x - n.x * half, y: a.y - n.y * half, strokeCap: 'NONE', strokeJoin: 'MITER' })

    segments.push(
      { start: base, end: base + 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: base + 1, end: base + 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: base + 2, end: base + 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: base + 3, end: base, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
    )
  }

  return {
    vertices,
    segments,
    regions: [
      {
        windingRule: 'NONZERO',
        loops: [segments.map((_, i) => i)]
      }
    ]
  }
}
