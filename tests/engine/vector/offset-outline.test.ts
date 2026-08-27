import { describe, test, expect } from 'bun:test'
import { offsetVectorNetwork, outlineStrokeNetwork } from '@nex-design/core/vector'
import type { VectorNetwork } from '@nex-design/core/scene-graph'

const SQUARE: VectorNetwork = {
  vertices: [
    { x: 0, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' },
    { x: 100, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER' },
    { x: 100, y: 100, strokeCap: 'NONE', strokeJoin: 'MITER' },
    { x: 0, y: 100, strokeCap: 'NONE', strokeJoin: 'MITER' }
  ],
  segments: [
    { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
    { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
    { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
    { start: 3, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
  ],
  regions: []
}

describe('Offset Path', () => {
  test('outset moves vertices outward', () => {
    const offset = offsetVectorNetwork(SQUARE, 10)
    expect(offset.vertices.length).toBe(4)
    const xs = offset.vertices.map((v) => v.x)
    expect(Math.min(...xs)).toBeLessThan(0)
  })

  test('inset moves vertices inward', () => {
    const inset = offsetVectorNetwork(SQUARE, -10)
    const xs = inset.vertices.map((v) => v.x)
    expect(Math.min(...xs)).toBeGreaterThan(0)
  })
})

describe('Outline Stroke', () => {
  test('creates 4 vertices per segment with stroke weight', () => {
    const outlined = outlineStrokeNetwork(SQUARE, 4)
    expect(outlined.vertices.length).toBe(SQUARE.segments.length * 4)
    expect(outlined.segments.length).toBe(SQUARE.segments.length * 4)
  })
})
