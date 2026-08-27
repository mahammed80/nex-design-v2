import type { ConstraintType, SceneGraph, SceneNode } from '#core/scene-graph'

export interface ChildConstraintUpdate {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function computeConstraintResize(
  child: SceneNode,
  origParentW: number,
  origParentH: number,
  newParentW: number,
  newParentH: number
): Partial<SceneNode> {
  const dw = newParentW - origParentW
  const dh = newParentH - origParentH

  let x = child.x
  let y = child.y
  let width = child.width
  let height = child.height

  const hConstraint: ConstraintType = child.horizontalConstraint ?? 'MIN'
  const vConstraint: ConstraintType = child.verticalConstraint ?? 'MIN'

  // Horizontal Constraint
  switch (hConstraint) {
    case 'MIN': // Left
      // x and width stay unchanged
      break
    case 'MAX': // Right
      x += dw
      break
    case 'STRETCH': // Left & Right
      width = Math.max(1, width + dw)
      break
    case 'CENTER': // Center
      x += dw / 2
      break
    case 'SCALE': // Scale
      if (origParentW > 0) {
        const scaleX = newParentW / origParentW
        x *= scaleX
        width = Math.max(1, width * scaleX)
      }
      break
  }

  // Vertical Constraint
  switch (vConstraint) {
    case 'MIN': // Top
      // y and height stay unchanged
      break
    case 'MAX': // Bottom
      y += dh
      break
    case 'STRETCH': // Top & Bottom
      height = Math.max(1, height + dh)
      break
    case 'CENTER': // Center
      y += dh / 2
      break
    case 'SCALE': // Scale
      if (origParentH > 0) {
        const scaleY = newParentH / origParentH
        y *= scaleY
        height = Math.max(1, height * scaleY)
      }
      break
  }

  return { x, y, width, height }
}

export function applyFrameChildConstraints(
  graph: SceneGraph,
  parentNode: SceneNode,
  origW: number,
  origH: number,
  newW: number,
  newH: number
): void {
  if (parentNode.layoutMode !== 'NONE' || !parentNode.childIds || parentNode.childIds.length === 0) {
    return
  }

  for (const childId of parentNode.childIds) {
    const child = graph.getNode(childId)
    if (!child) continue

    const updates = computeConstraintResize(child, origW, origH, newW, newH)
    graph.updateNode(childId, updates)
  }
}
