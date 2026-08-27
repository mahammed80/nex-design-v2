import type { EditorContext } from '#core/editor/types'
import { computeAllLayouts } from '#core/layout'
import type { SceneNode } from '#core/scene-graph'
import type { Vector } from '#core/types'

export type AlignmentType = 'LEFT' | 'CENTER_H' | 'RIGHT' | 'TOP' | 'CENTER_V' | 'BOTTOM'

function computeSingleNodeAlignment(
  node: SceneNode,
  parent: SceneNode,
  type: AlignmentType
): Vector {
  let { x, y } = node
  if (type === 'LEFT') x = 0
  else if (type === 'CENTER_H') x = (parent.width - node.width) / 2
  else if (type === 'RIGHT') x = parent.width - node.width
  else if (type === 'TOP') y = 0
  else if (type === 'CENTER_V') y = (parent.height - node.height) / 2
  else if (type === 'BOTTOM') y = parent.height - node.height
  return { x, y }
}

function computeMultiNodeAlignment(
  nodes: SceneNode[],
  type: AlignmentType,
  after: Map<string, Vector>
): void {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    maxX = Math.max(maxX, n.x + n.width)
    minY = Math.min(minY, n.y)
    maxY = Math.max(maxY, n.y + n.height)
  }

  for (const n of nodes) {
    let { x, y } = n
    if (type === 'LEFT') x = minX
    else if (type === 'CENTER_H') x = minX + (maxX - minX - n.width) / 2
    else if (type === 'RIGHT') x = maxX - n.width
    else if (type === 'TOP') y = minY
    else if (type === 'CENTER_V') y = minY + (maxY - minY - n.height) / 2
    else if (type === 'BOTTOM') y = maxY - n.height

    after.set(n.id, { x, y })
  }
}

export function createAlignmentActions(ctx: EditorContext) {
  function getSelectedMovableNodes(): SceneNode[] {
    const selectedIds = [...ctx.state.selectedIds]
    const nodes: SceneNode[] = []
    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (node && !node.locked) nodes.push(node)
    }
    return nodes
  }

  function applyPositionUpdates(
    label: string,
    before: Map<string, Vector>,
    after: Map<string, Vector>
  ) {
    if (before.size === 0) return

    for (const [id, pos] of after) {
      ctx.graph.updateNode(id, { x: pos.x, y: pos.y })
    }

    computeAllLayouts(ctx.graph, ctx.state.currentPageId)
    ctx.requestRender()

    ctx.undo.push({
      label,
      forward: () => {
        for (const [id, pos] of after) ctx.graph.updateNode(id, { x: pos.x, y: pos.y })
        computeAllLayouts(ctx.graph, ctx.state.currentPageId)
        ctx.requestRender()
      },
      inverse: () => {
        for (const [id, pos] of before) ctx.graph.updateNode(id, { x: pos.x, y: pos.y })
        computeAllLayouts(ctx.graph, ctx.state.currentPageId)
        ctx.requestRender()
      }
    })
  }

  function alignSelected(type: AlignmentType): boolean {
    const nodes = getSelectedMovableNodes()
    if (nodes.length === 0) return false

    const before = new Map<string, Vector>()
    const after = new Map<string, Vector>()

    for (const n of nodes) before.set(n.id, { x: n.x, y: n.y })

    if (nodes.length === 1 && nodes[0].parentId) {
      const node = nodes[0]
      const parent = ctx.graph.getNode(node.parentId)
      if (parent && parent.type !== 'CANVAS') {
        after.set(node.id, computeSingleNodeAlignment(node, parent, type))
        applyPositionUpdates(`Align ${type}`, before, after)
        return true
      }
    }

    computeMultiNodeAlignment(nodes, type, after)
    applyPositionUpdates(`Align ${type}`, before, after)
    return true
  }

  function distributeSpacing(axis: 'HORIZONTAL' | 'VERTICAL'): boolean {
    const nodes = getSelectedMovableNodes()
    if (nodes.length < 3) return false

    const before = new Map<string, Vector>()
    const after = new Map<string, Vector>()

    for (const n of nodes) before.set(n.id, { x: n.x, y: n.y })

    if (axis === 'HORIZONTAL') {
      const sorted = [...nodes].sort((a, b) => a.x - b.x)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      const totalSpan = last.x + last.width - first.x
      let totalNodesWidth = 0
      for (const n of sorted) totalNodesWidth += n.width

      const gap = (totalSpan - totalNodesWidth) / (sorted.length - 1)
      let currentX = first.x

      for (const n of sorted) {
        after.set(n.id, { x: currentX, y: n.y })
        currentX += n.width + gap
      }
    } else {
      const sorted = [...nodes].sort((a, b) => a.y - b.y)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      const totalSpan = last.y + last.height - first.y
      let totalNodesHeight = 0
      for (const n of sorted) totalNodesHeight += n.height

      const gap = (totalSpan - totalNodesHeight) / (sorted.length - 1)
      let currentY = first.y

      for (const n of sorted) {
        after.set(n.id, { x: n.x, y: currentY })
        currentY += n.height + gap
      }
    }

    applyPositionUpdates(`Distribute ${axis.toLowerCase()} spacing`, before, after)
    return true
  }

  function tidyUp(): boolean {
    const nodes = getSelectedMovableNodes()
    if (nodes.length < 2) return false

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x + n.width)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y + n.height)
    }

    const spanX = maxX - minX
    const spanY = maxY - minY

    if (spanX >= spanY) {
      return distributeSpacing('HORIZONTAL')
    }
    return distributeSpacing('VERTICAL')
  }

  function flipHorizontalSelected(): boolean {
    const nodes = getSelectedMovableNodes()
    if (nodes.length === 0) return false
    for (const n of nodes) {
      ctx.updateNodeWithUndo(n.id, { flipX: !n.flipX }, 'Flip Horizontal')
    }
    return true
  }

  function flipVerticalSelected(): boolean {
    const nodes = getSelectedMovableNodes()
    if (nodes.length === 0) return false
    for (const n of nodes) {
      ctx.updateNodeWithUndo(n.id, { flipY: !n.flipY }, 'Flip Vertical')
    }
    return true
  }

  return {
    alignSelected,
    distributeSpacing,
    tidyUp,
    flipHorizontalSelected,
    flipVerticalSelected
  }
}
