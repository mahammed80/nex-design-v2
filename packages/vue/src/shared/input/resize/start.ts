import type { Editor } from '@nex-design/core/editor'
import { cloneVectorNetwork } from '@nex-design/core/scene-graph'

import { snapshotSubtree } from '#core/editor/clipboard/subtree-history'
import { getHitHandleByMatrix } from '#vue/shared/input/geometry'
import { resolveResizeModeChanges } from '#vue/shared/input/resize/mode'
import type { DragResize } from '#vue/shared/input/types'

export function tryStartResize(cx: number, cy: number, editor: Editor): DragResize | null {
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    if (!node || node.locked) continue
    const handleResult = getHitHandleByMatrix(cx, cy, node, editor.graph, editor.renderer?.zoom)
    if (handleResult) {
      const modeChanges = resolveResizeModeChanges(node, handleResult.handle, editor.graph)
      if (Object.keys(modeChanges).length > 0) {
        editor.updateNode(id, modeChanges)
      }
      const updatedNode = editor.graph.getNode(id) ?? node
      return {
        type: 'resize',
        handle: handleResult.handle,
        startX: cx,
        startY: cy,
        origRect: {
          x: updatedNode.x,
          y: updatedNode.y,
          width: updatedNode.width,
          height: updatedNode.height
        },
        nodeId: id,
        origVectorNetwork: updatedNode.vectorNetwork
          ? cloneVectorNetwork(updatedNode.vectorNetwork)
          : null,
        origSubtree: snapshotSubtree(editor.graph, id)
      }
    }
  }
  return null
}
