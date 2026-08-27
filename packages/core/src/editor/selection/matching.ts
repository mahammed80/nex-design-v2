import type { EditorContext } from '#core/editor/types'
import type { SceneNode } from '#core/scene-graph'

export type SimilarMatchMode = 'TYPE' | 'FILL' | 'STROKE' | 'FONT' | 'NAME'

function getAllPageNodes(ctx: EditorContext): SceneNode[] {
  const nodes: SceneNode[] = []
  const queue = [...ctx.graph.getChildren(ctx.state.currentPageId)]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    nodes.push(current)
    if (current.childIds && current.childIds.length > 0) {
      for (const childId of current.childIds) {
        const child = ctx.graph.getNode(childId)
        if (child) queue.push(child)
      }
    }
  }

  return nodes
}

function matchesCriteria(target: SceneNode, candidate: SceneNode, mode: SimilarMatchMode): boolean {
  if (target.id === candidate.id) return true

  switch (mode) {
    case 'TYPE':
      return candidate.type === target.type
    case 'NAME':
      return candidate.name.toLowerCase() === target.name.toLowerCase()
    case 'FONT':
      return (
        target.type === 'TEXT' &&
        candidate.type === 'TEXT' &&
        candidate.fontFamily === target.fontFamily &&
        candidate.fontSize === target.fontSize
      )
    case 'FILL': {
      if (target.fills.length === 0 && candidate.fills.length === 0) return true
      if (target.fills.length !== candidate.fills.length) return false
      return target.fills.every((tf, i) => {
        const cf = candidate.fills[i]
        if (!cf || cf.type !== tf.type) return false
        if (tf.type === 'SOLID' && cf.type === 'SOLID') {
          return (
            tf.color.r === cf.color.r &&
            tf.color.g === cf.color.g &&
            tf.color.b === cf.color.b
          )
        }
        return true
      })
    }
    case 'STROKE': {
      if (target.strokes.length === 0 && candidate.strokes.length === 0) return true
      if (target.strokes.length !== candidate.strokes.length) return false
      return target.strokes.every((ts, i) => {
        const cs = candidate.strokes[i]
        return cs && cs.weight === ts.weight && cs.type === ts.type
      })
    }
    default:
      return false
  }
}

export function createMatchingActions(ctx: EditorContext) {
  function selectSimilar(mode: SimilarMatchMode = 'TYPE'): string[] {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return []

    const target = ctx.graph.getNode(selectedIds[0])
    if (!target) return []

    const allNodes = getAllPageNodes(ctx)
    const matchingIds: string[] = []

    for (const node of allNodes) {
      if (matchesCriteria(target, node, mode)) {
        matchingIds.push(node.id)
      }
    }

    if (matchingIds.length > 0) {
      ctx.setSelectedIds(new Set(matchingIds))
      ctx.requestRender()
    }

    return matchingIds
  }

  function selectAllMatchingType(): string[] {
    return selectSimilar('TYPE')
  }

  function selectAllMatchingFill(): string[] {
    return selectSimilar('FILL')
  }

  function selectAllMatchingStroke(): string[] {
    return selectSimilar('STROKE')
  }

  function selectAllMatchingFont(): string[] {
    return selectSimilar('FONT')
  }

  return {
    selectSimilar,
    selectAllMatchingType,
    selectAllMatchingFill,
    selectAllMatchingStroke,
    selectAllMatchingFont
  }
}
