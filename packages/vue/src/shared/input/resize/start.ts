import type { Editor } from '@nex-design/core/editor'
import { cloneVectorNetwork } from '@nex-design/core/scene-graph'

import { snapshotSubtree } from '#core/editor/clipboard/subtree-history'
import { getHitHandleByMatrix } from '#vue/shared/input/geometry'
import type { DragResize } from '#vue/shared/input/types'

export function tryStartResize(cx: number, cy: number, editor: Editor): DragResize | null {
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    if (!node || node.locked) continue
    const handleResult = getHitHandleByMatrix(cx, cy, node, editor.graph, editor.renderer?.zoom)
    if (handleResult) {
      return {
        type: 'resize',
        handle: handleResult.handle,
        startX: cx,
        startY: cy,
        origRect: { x: node.x, y: node.y, width: node.width, height: node.height },
        nodeId: id,
        origVectorNetwork: node.vectorNetwork ? cloneVectorNetwork(node.vectorNetwork) : null,
        origSubtree: snapshotSubtree(editor.graph, id)
      }
    }
  }
  return null
}
