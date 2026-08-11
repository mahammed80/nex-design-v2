import type { SceneNode } from './types'

export function validateSceneGraph(rootId: string, nodes: Map<string, SceneNode>): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const stack: string[] = [rootId]

  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) continue
    if (seen.has(id)) {
      errors.push(`Cycle detected at node ${id}`)
      continue
    }
    seen.add(id)

    const node = nodes.get(id)
    if (!node) {
      errors.push(`Orphan reference: ${id} not in nodes map`)
      continue
    }

    if (node.parentId === null) {
      if (id !== rootId) {
        errors.push(`Node ${id} has null parent but is not root`)
      }
    } else {
      const parent = nodes.get(node.parentId)
      if (!parent) {
        errors.push(`Node ${node.id} references missing parent ${node.parentId}`)
      } else if (!parent.childIds.includes(node.id)) {
        errors.push(`Node ${node.id} parent ${node.parentId} does not list it in childIds`)
      }
    }

    for (const childId of node.childIds) {
      const child = nodes.get(childId)
      if (child && child.parentId !== node.id) {
        errors.push(`Node ${childId} in ${node.id}.childIds has parentId ${child.parentId}`)
      }
      stack.push(childId)
    }
  }

  if (seen.size !== nodes.size) {
    const orphaned = [...nodes.keys()].filter((id) => !seen.has(id))
    errors.push(`Disconnected nodes not reachable from root: ${orphaned.join(', ')}`)
  }

  return errors
}
