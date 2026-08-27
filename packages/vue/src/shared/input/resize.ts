export { constrainToAspectRatio } from '#vue/shared/input/resize/rect'
export { tryStartResize } from '#vue/shared/input/resize/start'
import type { Editor } from '@nex-design/core/editor'
import { applyFrameChildConstraints } from '@nex-design/core/editor'
import type { SceneNode } from '@nex-design/core/scene-graph'

import { resolveResizeModeChanges } from '#vue/shared/input/resize/mode'
import { calculateResizeRect } from '#vue/shared/input/resize/rect'
import { scaleVectorNetworkForResize } from '#vue/shared/input/resize/vector'
import type { DragResize } from '#vue/shared/input/types'

function applyScaleToolTransformations(
  changes: Partial<SceneNode>,
  node: SceneNode,
  factor: number
) {
  if (node.type === 'TEXT' && typeof node.fontSize === 'number') {
    changes.fontSize = Math.max(1, Math.round(node.fontSize * factor))
  }
  if (typeof node.strokeWeight === 'number') {
    changes.strokeWeight = Math.max(0.5, Number((node.strokeWeight * factor).toFixed(2)))
  }
  if (typeof node.cornerRadius === 'number') {
    changes.cornerRadius = Math.max(0, Number((node.cornerRadius * factor).toFixed(2)))
  }
}

function applyTextResize(
  changes: Partial<SceneNode>,
  node: SceneNode,
  d: DragResize,
  origRect: { width: number; height: number },
  newRect: { width: number; height: number },
  editor: Editor
) {
  const isCornerHandle = d.handle.length === 2
  const isVerticalOnlyHandle = d.handle === 'n' || d.handle === 's'
  const renderer = editor.getRenderer?.()

  if (isCornerHandle && origRect.width > 0) {
    const factor = newRect.width / origRect.width
    changes.fontSize = Math.max(6, Math.round((node.fontSize || 14) * factor))
    changes.textAutoResize = 'WIDTH_AND_HEIGHT'
    const tempNode = { ...node, ...changes }
    const measured = renderer?.measureTextNode?.(tempNode as SceneNode)
    if (measured) {
      changes.width = Math.max(1, measured.width)
      changes.height = Math.max(1, measured.height)
    }
  } else if (isVerticalOnlyHandle) {
    changes.textAutoResize = 'NONE'
  } else {
    changes.textAutoResize = 'HEIGHT'
    const tempNode = { ...node, ...changes, width: newRect.width }
    const measured = renderer?.measureTextNode?.(tempNode as SceneNode, newRect.width)
    if (measured) {
      changes.height = Math.max(1, measured.height)
    }
  }
}

export function applyResize(
  d: DragResize,
  cx: number,
  cy: number,
  constrain: boolean,
  editor: Editor
) {
  const node = editor.graph.getNode(d.nodeId)
  if (!node) return

  const isScaleTool = editor.state.activeTool === 'SCALE'
  const modeChanges = resolveResizeModeChanges(node, d.handle, editor.graph)

  const { origRect } = d
  const newRect = calculateResizeRect(
    d.handle,
    origRect,
    cx - d.startX,
    cy - d.startY,
    constrain || isScaleTool
  )

  const changes: Partial<SceneNode> = { ...modeChanges, ...newRect }

  if (isScaleTool && origRect.width > 0) {
    const factor = newRect.width / origRect.width
    applyScaleToolTransformations(changes, node, factor)
  } else if (node.type === 'TEXT') {
    applyTextResize(changes, node, d, origRect, newRect, editor)
  }

  const resizedVectorNetwork = scaleVectorNetworkForResize(
    d.origVectorNetwork,
    origRect.width,
    origRect.height,
    newRect.width,
    newRect.height
  )
  if (resizedVectorNetwork) changes.vectorNetwork = resizedVectorNetwork

  editor.updateNode(d.nodeId, changes)

  if (node.type === 'FRAME' || node.type === 'COMPONENT') {
    applyFrameChildConstraints(
      editor.graph,
      node,
      origRect.width,
      origRect.height,
      newRect.width,
      newRect.height
    )
  }
}
