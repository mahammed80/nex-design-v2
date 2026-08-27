import { describe, test, expect } from 'bun:test'

import { createEditor } from '@nex-design/core/editor'
import { applyFrameChildConstraints, computeConstraintResize } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Responsive Frame Constraints', () => {
  test('computes LEFT (MIN) and TOP (MIN) constraint resize', () => {
    const child = {
      id: 'c1',
      x: 20,
      y: 30,
      width: 100,
      height: 50,
      horizontalConstraint: 'MIN' as const,
      verticalConstraint: 'MIN' as const
    } as any

    const updates = computeConstraintResize(child, 200, 200, 300, 300)
    expect(updates.x).toBe(20)
    expect(updates.y).toBe(30)
    expect(updates.width).toBe(100)
    expect(updates.height).toBe(50)
  })

  test('computes RIGHT (MAX) and BOTTOM (MAX) constraint resize', () => {
    const child = {
      id: 'c2',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      horizontalConstraint: 'MAX' as const,
      verticalConstraint: 'MAX' as const
    } as any

    const updates = computeConstraintResize(child, 200, 200, 300, 250)
    expect(updates.x).toBe(200) // 100 + dw (100)
    expect(updates.y).toBe(150) // 100 + dh (50)
    expect(updates.width).toBe(50)
    expect(updates.height).toBe(50)
  })

  test('computes STRETCH constraint resize (Left & Right, Top & Bottom)', () => {
    const child = {
      id: 'c3',
      x: 10,
      y: 10,
      width: 180,
      height: 80,
      horizontalConstraint: 'STRETCH' as const,
      verticalConstraint: 'STRETCH' as const
    } as any

    const updates = computeConstraintResize(child, 200, 100, 300, 150)
    expect(updates.x).toBe(10)
    expect(updates.y).toBe(10)
    expect(updates.width).toBe(280) // 180 + dw (100)
    expect(updates.height).toBe(130) // 80 + dh (50)
  })

  test('computes CENTER constraint resize', () => {
    const child = {
      id: 'c4',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      horizontalConstraint: 'CENTER' as const,
      verticalConstraint: 'CENTER' as const
    } as any

    const updates = computeConstraintResize(child, 200, 200, 300, 300)
    expect(updates.x).toBe(100) // 50 + dw/2 (50)
    expect(updates.y).toBe(100) // 50 + dh/2 (50)
  })

  test('computes SCALE constraint resize', () => {
    const child = {
      id: 'c5',
      x: 40,
      y: 20,
      width: 100,
      height: 50,
      horizontalConstraint: 'SCALE' as const,
      verticalConstraint: 'SCALE' as const
    } as any

    const updates = computeConstraintResize(child, 200, 100, 400, 200)
    expect(updates.x).toBe(80) // 40 * 2
    expect(updates.y).toBe(40) // 20 * 2
    expect(updates.width).toBe(200) // 100 * 2
    expect(updates.height).toBe(100) // 50 * 2
  })

  test('applies constraints across all children in a frame', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'CardFrame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      layoutMode: 'NONE'
    })

    const rightBtn = editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'CloseButton',
      x: 170,
      y: 10,
      width: 20,
      height: 20,
      horizontalConstraint: 'MAX',
      verticalConstraint: 'MIN'
    })

    const banner = editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'Banner',
      x: 10,
      y: 10,
      width: 180,
      height: 60,
      horizontalConstraint: 'STRETCH',
      verticalConstraint: 'MIN'
    })

    applyFrameChildConstraints(editor.graph, frame, 200, 200, 300, 250)

    const updatedBtn = getNodeOrThrow(editor.graph, rightBtn.id)
    const updatedBanner = getNodeOrThrow(editor.graph, banner.id)

    expect(updatedBtn.x).toBe(270)
    expect(updatedBtn.y).toBe(10)

    expect(updatedBanner.width).toBe(280)
    expect(updatedBanner.x).toBe(10)
  })
})
