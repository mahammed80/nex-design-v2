import { DEFAULT_TEXT_HEIGHT, DEFAULT_TEXT_WIDTH } from '@nex-design/core/constants'
import type { Editor } from '@nex-design/core/editor'

import { findMoveDropTarget } from '#vue/shared/input/drop-target'
import { TOOL_TO_NODE } from '#vue/shared/input/types'
import type { DragDraw, DragState } from '#vue/shared/input/types'

export function startShapeDraw(
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (d: DragState) => void
) {
  const nodeType = TOOL_TO_NODE[editor.state.activeTool]
  if (!nodeType) return

  editor.undo.beginBatch('Create shape')
  const nodeId = editor.createShape(nodeType, cx, cy, 0, 0)
  editor.select([nodeId])
  setDrag({ type: 'draw', startX: cx, startY: cy, nodeId })
}

export function handleDrawMove(
  d: DragDraw,
  cx: number,
  cy: number,
  shiftKey: boolean,
  editor: Editor
) {
  let w = cx - d.startX
  let h = cy - d.startY

  if (shiftKey) {
    const size = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w) * size
    h = Math.sign(h) * size
  }

  editor.updateNode(d.nodeId, {
    x: w < 0 ? d.startX + w : d.startX,
    y: h < 0 ? d.startY + h : d.startY,
    width: Math.abs(w),
    height: Math.abs(h)
  })
}

import type { SceneNode } from '@nex-design/core/scene-graph'

export function handleDrawUp(d: DragDraw, editor: Editor) {
  const node = editor.graph.getNode(d.nodeId)
  if (node && node.width < 2 && node.height < 2) {
    if (node.type === 'TEXT') {
      editor.updateNode(d.nodeId, {
        width: DEFAULT_TEXT_WIDTH,
        height: DEFAULT_TEXT_HEIGHT,
        textAutoResize: 'NONE'
      })
    } else {
      editor.updateNode(d.nodeId, { width: 100, height: 100 })
    }
  } else if (node && node.type === 'TEXT') {
    editor.updateNode(d.nodeId, { textAutoResize: 'NONE' })
  }

  // Find target container and reparent if inside it
  const target = findMoveDropTarget(d.startX, d.startY, editor)
  if (target && target.id !== editor.state.currentPageId) {
    editor.graph.reparentNode(d.nodeId, target.id)
  }

  if (node?.type === 'SECTION') {
    editor.adoptNodesIntoSection(node.id)
  }

  const origSubtree = new Map<string, SceneNode>()
  if (node) {
    origSubtree.set(d.nodeId, {
      ...node,
      x: d.startX,
      y: d.startY,
      width: 0,
      height: 0
    })
  }

  editor.commitResize(d.nodeId, origSubtree)
  editor.undo.commitBatch()

  if (node?.type === 'TEXT') {
    editor.startTextEditing(d.nodeId)
  }

  editor.setTool('SELECT')
}
