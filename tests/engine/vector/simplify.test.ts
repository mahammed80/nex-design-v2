import { describe, test, expect } from 'bun:test'
import { simplifyVectorNetwork } from '@nex-design/core/vector'
import type { VectorNetwork } from '@nex-design/core/scene-graph'


describe('Vector Path Simplification (Ramer-Douglas-Peucker)', () => {
  test('reduces collinear or near-collinear points along a path', () => {
    const network: VectorNetwork = {
      vertices: [
        { x: 0, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 10, y: 0.1, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 20, y: 0.2, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 30, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
      ],
      regions: []
    }


    const simplified = simplifyVectorNetwork(network, 1.0)
    expect(simplified.vertices.length).toBe(2)
    expect(simplified.vertices[0].x).toBe(0)
    expect(simplified.vertices[1].x).toBe(30)
  })


  test('preserves sharp corners above epsilon threshold', () => {
    const network: VectorNetwork = {
      vertices: [
        { x: 0, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 10, y: 0.1, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 20, y: 100, strokeCap: 'NONE', strokeJoin: 'MITER' },
        { x: 30, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
      ],
      regions: []
    }


    const simplified = simplifyVectorNetwork(network, 1.0)
    expect(simplified.vertices.length).toBe(3)
    expect(simplified.vertices[1].y).toBe(100)
  })
})
