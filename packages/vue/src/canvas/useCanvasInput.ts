import { useEventListener } from '@vueuse/core'
import { ref, type Ref } from 'vue'

import { RULER_SIZE } from '@nex-design/core/constants'
import type { Editor } from '@nex-design/core/editor'
import type { ConnectionSide } from '@nex-design/core/prototype'
import { getAncestorStack, type SceneNode, type ActionType } from '@nex-design/core/scene-graph'
import type { Rect, Vector } from '@nex-design/core/types'

import { useCanvasInteraction } from '#vue/canvas/interaction/use'
import {
  handleBendHandleMove,
  handleNodeEditMouseUp,
  updateNodeEditHover
} from '#vue/canvas/node-edit-input/use'
import { handlePenDragMove, updatePenHover } from '#vue/canvas/pen-input/use'
import { createCanvasPointer } from '#vue/canvas/pointer/use'
import { createTextEditInput } from '#vue/canvas/text-edit/input'
import { handleToolMouseDown } from '#vue/canvas/tool-input/use'
import { createCanvasTransformInput } from '#vue/canvas/transform-input/use'
import { createClickCounter } from '#vue/shared/input/click-count'
import { handleDrawMove, handleDrawUp } from '#vue/shared/input/draw'
import { handleMoveMove, handleMoveUp } from '#vue/shared/input/move'
import { handleNodeEditMove } from '#vue/shared/input/node-edit'
import { setupPanZoom } from '#vue/shared/input/pan-zoom'
import { applyResize } from '#vue/shared/input/resize'
import { updateHoverCursor } from '#vue/shared/input/select'
import { useSpaceHeld } from '#vue/shared/input/space-key'
import type { DragState } from '#vue/shared/input/types'

/**
 * Wires pointer and mouse interaction to an NexDesign canvas.
 *
 * This composable coordinates selection, dragging, resizing, rotation,
 * panning, drawing tools, scoped hit testing, and text-edit interaction.
 * It is primarily intended for editor shell components that own the canvas.
 */
export function useCanvasInput(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null,
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null,
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null,
  onCursorMove?: (cx: number, cy: number) => void
) {
  const drag = ref<DragState | null>(null)
  const cursorOverride = ref<string | null>(null)
  const spaceHeld = useSpaceHeld()
  const { recordClick, getClickCount } = createClickCounter()
  const interaction = useCanvasInteraction(editor)

  const { getCoords, canvasToLocal, hitTestInScope, hitFns } = createCanvasPointer(
    canvasRef,
    editor,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  )

  function setDrag(d: DragState | null) {
    drag.value = d
  }

  const { handleTextEditClick, onDblClick } = createTextEditInput({
    editor,
    getCoords,
    hitTestInScope,
    hitTestSectionTitle,
    hitTestComponentLabel,
    getClickCount,
    setDrag
  })

  const {
    tryStartRotation,
    handlePanMove,
    handleRotateMove,
    handleTextSelectMove,
    handleMarqueeMove
  } = createCanvasTransformInput(editor, canvasToLocal, setDrag)

  function onMouseDown(e: MouseEvent) {
    if (!editor.state.editingTextId) canvasRef.value?.focus()
    editor.setHoveredNode(null)
    const { sx, sy, cx, cy } = getCoords(e)

    recordClick(sx, sy)
    editor.setSelectedGuideId(null)

    if (tryHandleGuideMouseDown(sx, sy, cx, cy, editor, setDrag)) return

    const pointerDown = interaction.dispatch('pointerdown', e, cx, cy, sx, sy, {
      clickCount: getClickCount()
    })
    if (pointerDown.defaultPrevented) return

    if (tryHandlePrototypeMouseDown(sx, sy, editor, setDrag)) return

    handleToolMouseDown({
      event: e,
      cx,
      cy,
      editor,
      hitFns,
      cursorOverride,
      setDrag,
      tryStartRotation,
      handleTextEditClick
    })
  }

  function handleDragMouseMove(d: DragState, e: MouseEvent, cx: number, cy: number) {
    switch (d.type) {
      case 'pan':
        handlePanMove(d, e)
        break
      case 'guide-drag':
        editor.updateGuideValue(
          d.guideId,
          d.axis === 'horizontal' ? Math.round(cy) : Math.round(cx)
        )
        break
      case 'prototype-drag': {
        const rect = canvasRef.value?.getBoundingClientRect()
        const endX = rect ? e.clientX - rect.left : d.startX
        const endY = rect ? e.clientY - rect.top : d.startY
        editor.state.prototypeDragLine = { startX: d.startX, startY: d.startY, endX, endY }
        editor.requestRepaint()
        break
      }
      case 'rotate':
        handleRotateMove(d, cx, cy, e.shiftKey)
        break
      case 'move':
        handleMoveMove(d, cx, cy, editor)
        break
      case 'text-select':
        handleTextSelectMove(cx, cy)
        break
      case 'resize':
        applyResize(d, cx, cy, e.shiftKey, editor)
        break
      case 'pen-drag':
        handlePenDragMove(d, cx, cy, spaceHeld.value, e, editor)
        break
      case 'edit-node':
      case 'edit-handle':
        handleNodeEditMove(d, cx, cy, editor, e.altKey, e.metaKey || e.ctrlKey, e.shiftKey)
        break
      case 'bend-handle':
        handleBendHandleMove(d, cx, cy, e, editor)
        break
      case 'draw':
        handleDrawMove(d, cx, cy, e.shiftKey, editor)
        break
      case 'marquee':
        handleMarqueeMove(d, cx, cy)
        break
    }
  }

  function handleGuideDragMouseUp(
    d: Extract<DragState, { type: 'guide-drag' }>,
    e: MouseEvent | undefined
  ) {
    if (e) {
      const { sx, sy } = getCoords(e)
      if (d.axis === 'horizontal' && sy <= RULER_SIZE) {
        editor.removeGuide(d.guideId, 'Delete guide')
      } else if (d.axis === 'vertical' && sx <= RULER_SIZE) {
        editor.removeGuide(d.guideId, 'Delete guide')
      } else if (!d.isNew) {
        const finalVal = d.axis === 'horizontal' ? Math.round(sy) : Math.round(sx)
        const startVal = d.startValue
        const guideId = d.guideId
        if (finalVal !== startVal) {
          editor.undo.push({
            label: 'Move guide',
            forward: () => editor.updateGuideValue(guideId, finalVal),
            inverse: () => editor.updateGuideValue(guideId, startVal)
          })
        }
      }
    }
    setDrag(null)
  }

  function handlePrototypeDragMouseUp(
    d: Extract<DragState, { type: 'prototype-drag' }>,
    e: MouseEvent
  ) {
    const { cx, cy } = getCoords(e)
    let hitNode = editor.graph.hitTest(cx, cy, editor.state.currentPageId)
    if (!hitNode) {
      hitNode =
        hitFns.hitTestFrameTitle(cx, cy) ??
        hitFns.hitTestSectionTitle(cx, cy) ??
        hitFns.hitTestComponentLabel(cx, cy)
    }
    if (!hitNode) {
      const hit = editor.graph.hitTestDeep(cx, cy, editor.state.currentPageId)
      if (hit) hitNode = hit
    }

    if (hitNode && hitNode.id !== d.nodeId) {
      const targetNode = resolveDragTarget(editor.graph, hitNode.id, d.nodeId)
      if (targetNode) {
        let actionType: ActionType = 'NAVIGATE'
        const sourceNode = editor.graph.getNode(d.nodeId)
        
        if (targetNode.type === 'COMPONENT' && targetNode.parentId) {
          const parent = editor.graph.getNode(targetNode.parentId)
          if (parent?.type === 'COMPONENT_SET') {
            if (
              sourceNode &&
              ((sourceNode.type === 'COMPONENT' && sourceNode.parentId === targetNode.parentId) ||
               (sourceNode.type === 'INSTANCE' && sourceNode.componentId &&
                editor.graph.getNode(sourceNode.componentId)?.parentId === targetNode.parentId))
            ) {
              actionType = 'CHANGE_TO'
            }
          }
        } else if (
          targetNode.type !== 'FRAME' &&
          targetNode.type !== 'SECTION' &&
          targetNode.type !== 'COMPONENT' &&
          targetNode.type !== 'INSTANCE'
        ) {
          actionType = 'SCROLL_TO'
        }

        editor.addReaction(d.nodeId, {
          trigger: { type: 'ON_CLICK' },
          actions: [
            {
              type: actionType,
              destinationId: targetNode.id,
              transition: { type: 'INSTANT', duration: 300, easing: 'EASE_IN_AND_OUT' }
            }
          ]
        })

        const pageId = editor.state.currentPageId
        const pageNode = editor.graph.getNode(pageId)
        if (pageNode?.type === 'CANVAS') {
          const conn = (pageNode.prototypeConnections ?? []).find(
            (c) =>
              c.sourceNodeId === d.nodeId &&
              c.targetNodeId === targetNode.id &&
              c.triggerType === 'ON_CLICK'
          )
          if (conn) {
            const targetBounds = editor.graph.getAbsoluteBounds(targetNode.id)
            const closest = closestSideOfRect(targetBounds, { x: cx, y: cy })
            editor.updateConnectionGeometry(conn.id, {
              sourceAnchor: { side: d.side, offset: 0.5 },
              targetAnchor: { side: closest.side, offset: closest.offset }
            })
          }
        }
      }
    }
  }

  function handleDragMouseUp(d: DragState, e: MouseEvent | undefined) {
    switch (d.type) {
      case 'move':
        handleMoveUp(d, editor)
        break
      case 'guide-drag':
        handleGuideDragMouseUp(d, e)
        break
      case 'prototype-drag':
        editor.state.prototypeDragLine = null
        if (e) handlePrototypeDragMouseUp(d, e)
        editor.requestRender()
        break
      case 'text-select':
        setDrag(null)
        break
      case 'resize':
        editor.commitResize(d.nodeId, d.origSubtree)
        break
      case 'pen-drag': {
        const penState = editor.state.penState as
          | (typeof editor.state.penState & { pendingClose?: boolean })
          | null
        if (penState?.pendingClose) editor.penCommit(true)
        setDrag(null)
        break
      }
      case 'rotate': {
        const preview = editor.state.rotationPreview
        if (preview) {
          editor.updateNode(d.nodeId, { rotation: preview.angle })
          editor.commitRotation(d.nodeId, d.origRotation)
        }
        editor.setRotationPreview(null)
        break
      }
      case 'draw':
        handleDrawUp(d, editor)
        break
      case 'marquee':
        editor.setMarquee(null)
        break
    }
  }

  function onMouseMove(e: MouseEvent) {
    const { sx, sy, cx, cy } = getCoords(e)
    if (onCursorMove) onCursorMove(cx, cy)

    if (!drag.value) {
      interaction.dispatch('pointermove', e, cx, cy, sx, sy, {
        updateHover: true,
        clickCount: getClickCount()
      })
      updatePenHover(cx, cy, editor)
      updateNodeEditHover(editor, cx, cy)
    }

    if (!drag.value && editor.state.activeTool === 'SELECT') {
      cursorOverride.value = updateHoverCursor(cx, cy, editor, hitFns)
    }

    if (!drag.value) return
    handleDragMouseMove(drag.value, e, cx, cy)
  }

  function onMouseUp(e?: MouseEvent) {
    if (e) {
      const { sx, sy, cx, cy } = getCoords(e)
      const pointerUp = interaction.dispatch('pointerup', e, cx, cy, sx, sy, {
        clickCount: getClickCount()
      })
      if (pointerUp.defaultPrevented) return
    }
    if (!drag.value) return
    const d = drag.value

    if (handleNodeEditMouseUp(drag, editor)) return

    handleDragMouseUp(d, e)

    drag.value = null
    cursorOverride.value = null
  }

  function onMouseClick(e: MouseEvent) {
    const { sx, sy, cx, cy } = getCoords(e)
    const count = getClickCount()
    interaction.dispatch(count >= 3 ? 'tripleclick' : 'click', e, cx, cy, sx, sy, {
      clickCount: count
    })
  }

  function onContextMenu(e: MouseEvent) {
    const { sx, sy, cx, cy } = getCoords(e)
    const ctx = interaction.dispatch('contextmenu', e, cx, cy, sx, sy, {
      clickCount: getClickCount()
    })
    if (ctx.defaultPrevented) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function onWheel(e: WheelEvent) {
    const { sx, sy, cx, cy } = getCoords(e)
    interaction.dispatch('wheel', e, cx, cy, sx, sy)
  }

  function keyEventStack(): SceneNode[] {
    const editId = editor.state.editingTextId
    const targetId =
      editId ?? (editor.state.selectedIds.size === 1 ? [...editor.state.selectedIds][0] : null)
    if (!targetId) return []
    const page = editor.graph.getNode(editor.state.currentPageId)
    const stack = [page, ...getAncestorStack(editor.graph, targetId, editor.state.currentPageId)]
    return stack.filter((n): n is SceneNode => n !== undefined)
  }

  function onKeyDown(e: KeyboardEvent) {
    interaction.dispatchStack('keydown', e, keyEventStack())
  }

  function onKeyUp(e: KeyboardEvent) {
    interaction.dispatchStack('keyup', e, keyEventStack())
  }

  useEventListener(canvasRef, 'dblclick', (e) => {
    const { sx, sy, cx, cy } = getCoords(e)
    const dbl = interaction.dispatch('dblclick', e, cx, cy, sx, sy, { clickCount: 2 })
    if (dbl.defaultPrevented) return
    onDblClick(e)
  })
  useEventListener(canvasRef, 'mousedown', onMouseDown)
  useEventListener(canvasRef, 'mousemove', onMouseMove)
  useEventListener(canvasRef, 'mouseup', onMouseUp)
  useEventListener(canvasRef, 'click', onMouseClick)
  useEventListener(canvasRef, 'contextmenu', onContextMenu)
  useEventListener(canvasRef, 'wheel', onWheel)
  useEventListener(canvasRef, 'keydown', onKeyDown)
  useEventListener(canvasRef, 'keyup', onKeyUp)
  useEventListener(canvasRef, 'mouseleave', () => {
    if (!drag.value) {
      editor.setHoveredNode(null)
      interaction.resetHover()
    }
  })
  useEventListener(window, 'mouseup', () => {
    if (drag.value) onMouseUp()
  })

  setupPanZoom(canvasRef, editor, drag, onMouseDown, onMouseMove, onMouseUp)
  return {
    drag,
    cursorOverride,
    interaction
  }
}

function closestSideOfRect(rect: Rect, p: Vector): { side: ConnectionSide; offset: number } {
  const leftDist = Math.abs(p.x - rect.x)
  const rightDist = Math.abs(p.x - (rect.x + rect.width))
  const topDist = Math.abs(p.y - rect.y)
  const bottomDist = Math.abs(p.y - (rect.y + rect.height))
  const minDist = Math.min(leftDist, rightDist, topDist, bottomDist)

  if (minDist === leftDist) {
    const rawOffset = (p.y - rect.y) / (rect.height || 1)
    const offset = Math.abs(rawOffset - 0.5) < 0.1 ? 0.5 : Math.max(0, Math.min(1, rawOffset))
    return { side: 'LEFT', offset }
  } else if (minDist === rightDist) {
    const rawOffset = (p.y - rect.y) / (rect.height || 1)
    const offset = Math.abs(rawOffset - 0.5) < 0.1 ? 0.5 : Math.max(0, Math.min(1, rawOffset))
    return { side: 'RIGHT', offset }
  } else if (minDist === topDist) {
    const rawOffset = (p.x - rect.x) / (rect.width || 1)
    const offset = Math.abs(rawOffset - 0.5) < 0.1 ? 0.5 : Math.max(0, Math.min(1, rawOffset))
    return { side: 'TOP', offset }
  } else {
    const rawOffset = (p.x - rect.x) / (rect.width || 1)
    const offset = Math.abs(rawOffset - 0.5) < 0.1 ? 0.5 : Math.max(0, Math.min(1, rawOffset))
    return { side: 'BOTTOM', offset }
  }
}

function resolveDragTarget(
  graph: { getNode: (id: string) => SceneNode | undefined },
  nodeId: string,
  sourceNodeId: string
): SceneNode | null {
  const hitNode = graph.getNode(nodeId)
  if (!hitNode) return null

  const sourceNode = graph.getNode(sourceNodeId)
  if (sourceNode && hitNode.type === 'COMPONENT') {
    const parent = hitNode.parentId ? graph.getNode(hitNode.parentId) : null
    if (parent?.type === 'COMPONENT_SET') {
      if (
        (sourceNode.type === 'COMPONENT' && sourceNode.parentId === hitNode.parentId) ||
        (sourceNode.type === 'INSTANCE' && sourceNode.componentId && 
         graph.getNode(sourceNode.componentId)?.parentId === hitNode.parentId)
      ) {
        return hitNode
      }
    }
  }

  let current: SceneNode | undefined = hitNode
  while (current) {
    if (
      current.type === 'FRAME' ||
      current.type === 'SECTION' ||
      current.type === 'COMPONENT'
    ) {
      return current
    }
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return hitNode
}

function tryHandleGuideMouseDown(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (val: DragState | null) => void
): boolean {
  if (!editor.state.guidesVisible) return false

  const zoom = editor.state.zoom
  const panX = editor.state.panX
  const panY = editor.state.panY

  if (!editor.state.guidesLocked) {
    if (sy <= RULER_SIZE && sx > RULER_SIZE) {
      const val = Math.round(cy)
      const guideId = editor.addGuide('horizontal', val, 'Drag horizontal guide')
      editor.setSelectedGuideId(guideId)
      setDrag({
        type: 'guide-drag',
        guideId,
        axis: 'horizontal',
        startValue: val,
        isNew: true
      })
      return true
    }
    if (sx <= RULER_SIZE && sy > RULER_SIZE) {
      const val = Math.round(cx)
      const guideId = editor.addGuide('vertical', val, 'Drag vertical guide')
      editor.setSelectedGuideId(guideId)
      setDrag({
        type: 'guide-drag',
        guideId,
        axis: 'vertical',
        startValue: val,
        isNew: true
      })
      return true
    }
  }

  let hitGuideId: string | null = null
  let hitGuideAxis: 'horizontal' | 'vertical' | null = null
  let hitGuideVal = 0

  for (const g of editor.state.guides) {
    if (g.type === 'horizontal') {
      const guideSy = g.value * zoom + panY
      if (Math.abs(sy - guideSy) <= 6 && sx > RULER_SIZE) {
        hitGuideId = g.id
        hitGuideAxis = 'horizontal'
        hitGuideVal = g.value
        break
      }
    } else {
      const guideSx = g.value * zoom + panX
      if (Math.abs(sx - guideSx) <= 6 && sy > RULER_SIZE) {
        hitGuideId = g.id
        hitGuideAxis = 'vertical'
        hitGuideVal = g.value
        break
      }
    }
  }

  if (hitGuideId && hitGuideAxis) {
    editor.setSelectedGuideId(hitGuideId)
    if (!editor.state.guidesLocked) {
      setDrag({
        type: 'guide-drag',
        guideId: hitGuideId,
        axis: hitGuideAxis,
        startValue: hitGuideVal,
        isNew: false
      })
    }
    return true
  }

  return false
}

function tryHandlePrototypeMouseDown(
  sx: number,
  sy: number,
  editor: Editor,
  setDrag: (val: DragState | null) => void
): boolean {
  if (editor.state.mode !== 'PROTOTYPE') return false

  const zoom = editor.state.zoom
  const panX = editor.state.panX
  const panY = editor.state.panY

  for (const id of editor.state.selectedIds) {
    const bounds = editor.graph.getAbsoluteBounds(id)
    const rx = (bounds.x + bounds.width) * zoom + panX + 8
    const ry = (bounds.y + bounds.height / 2) * zoom + panY
    if (Math.hypot(sx - rx, sy - ry) <= 12) {
      setDrag({
        type: 'prototype-drag',
        startX: rx,
        startY: ry,
        nodeId: id,
        side: 'RIGHT'
      })
      return true
    }

    const lx = bounds.x * zoom + panX - 8
    const ly = (bounds.y + bounds.height / 2) * zoom + panY
    if (Math.hypot(sx - lx, sy - ly) <= 12) {
      setDrag({
        type: 'prototype-drag',
        startX: lx,
        startY: ly,
        nodeId: id,
        side: 'LEFT'
      })
      return true
    }
  }

  return false
}
