import { defineTool } from '#core/tools/schema'

import type { FigmaAPI } from '#core/figma-api'
import type { Rect } from '#core/types'

const PAGE_ROOT_GAP = 100

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/**
 * Keep page-level roots from stacking on each other: fragments like
 * `<><Desktop/><Mobile/></>` and repeated renders without x/y otherwise all land at
 * the same origin. Roots that collide with an existing top-level node are moved to
 * the right of the page's content.
 */
function separatePageRoots(figma: FigmaAPI, pageId: string, rootIds: string[]) {
  const page = figma.graph.getNode(pageId)
  if (!page || page.type !== 'CANVAS') return
  const placed: Rect[] = []
  for (const id of page.childIds) {
    const node = figma.graph.getNode(id)
    if (node && node.visible && !rootIds.includes(id)) placed.push(node)
  }
  for (const id of rootIds) {
    const node = figma.graph.getNode(id)
    if (!node) continue
    if (placed.some((other) => overlaps(node, other))) {
      const right = Math.max(...placed.map((other) => other.x + other.width))
      figma.graph.updateNode(id, { x: right + PAGE_ROOT_GAP })
    }
    const updated = figma.graph.getNode(id)
    if (updated) placed.push(updated)
  }
}

export const render = defineTool({
  name: 'render',
  mutates: true,
  description:
    'Render JSX to design nodes. Use replace_id to swap a skeleton placeholder with real content (keeps position in parent). Example: <Frame name="Card" w={320} h="hug" flex="col" gap={16} p={24} bg="#FFF" rounded={16}><Text size={18} weight="bold">Title</Text></Frame>',
  params: {
    replace_id: {
      type: 'string',
      description: 'Node ID to replace — new node takes its position in parent, old node is deleted'
    },
    parent_id: { type: 'string', description: 'Parent node ID to render into' },
    insert_index: {
      type: 'number',
      description: 'Position among siblings (0 = first child). Omit to append at end.'
    },
    x: { type: 'number', description: 'X position of the root node' },
    y: { type: 'number', description: 'Y position of the root node' },
    jsx: { type: 'string', description: 'JSX string to render', required: true }
  },
  execute: async (figma, args) => {
    const { renderJSX } = await import('#core/design-jsx/render.js')

    let parentId = args.parent_id ?? figma.currentPageId
    let replaceIndex = -1

    if (args.replace_id) {
      const target = figma.graph.getNode(args.replace_id)
      if (target?.parentId) {
        parentId = target.parentId
        const parent = figma.graph.getNode(parentId)
        if (parent) {
          replaceIndex = parent.childIds.indexOf(args.replace_id)
        }
      }
    }

    const results = await renderJSX(figma.graph, args.jsx, {
      parentId,
      x: args.x,
      y: args.y
    })
    const result = results[0]

    if (args.replace_id && replaceIndex >= 0) {
      figma.graph.reorderChild(result.id, parentId, replaceIndex)
      figma.graph.deleteNode(args.replace_id)
    } else if (args.insert_index !== undefined) {
      figma.graph.reorderChild(result.id, parentId, args.insert_index)
    }

    if (!args.replace_id) {
      separatePageRoots(
        figma,
        parentId,
        results.map((res) => res.id)
      )
    }

    const node = figma.graph.getNode(result.id)

    return {
      id: result.id,
      name: result.name,
      type: result.type,
      x: node?.x,
      y: node?.y,
      width: node?.width,
      height: node?.height,
      children: result.childIds,
      ...(results.length > 1
        ? {
            siblings: results.slice(1).map((res) => {
              const sNode = figma.graph.getNode(res.id)
              return {
                id: res.id,
                name: res.name,
                type: res.type,
                x: sNode?.x,
                y: sNode?.y,
                width: sNode?.width,
                height: sNode?.height
              }
            })
          }
        : {})
    }
  }
})
