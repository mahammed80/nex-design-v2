import type { SceneNode } from '#core/scene-graph'
import { instanceOverrideKey } from '#core/scene-graph/instances'
import type { Color } from '#core/types'

import { fitComponentSetBounds } from './components/variants'
import { createLayoutModeActions } from './layout-mode'
import { createNudgeActions } from './nudge'
import type { EditorContext } from './types'
import { createVariableBindingActions } from './variable-bindings'

export function createNodeActions(ctx: EditorContext) {
  const layoutModeActions = createLayoutModeActions(ctx)
  const nudgeActions = createNudgeActions(ctx)
  const variableBindingActions = createVariableBindingActions(ctx)

  function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true
    try {
      return JSON.stringify(left) === JSON.stringify(right)
    } catch {
      return false
    }
  }

  function clonedValue<T>(value: T): T {
    if (value === undefined || value === null || typeof value !== 'object') return value
    return structuredClone(value)
  }

  function findOwningInstance(node: SceneNode): SceneNode | undefined {
    let current: SceneNode | undefined = node
    while (current) {
      if (current.type === 'INSTANCE') return current
      current = current.parentId ? ctx.graph.getNode(current.parentId) : undefined
    }
    return undefined
  }

  function recordOverrides(node: SceneNode, changes: Partial<SceneNode>) {
    const instance = findOwningInstance(node)
    if (!instance?.componentId) return null
    const sourceId = node.type === 'INSTANCE' ? instance.componentId : node.componentId
    const source = sourceId ? ctx.graph.getNode(sourceId) : undefined
    if (!source) return null

    const previous = structuredClone(instance.overrides)
    const next = structuredClone(instance.overrides)
    const lineageId = node.componentLineageId ?? source.componentLineageId ?? source.id

    for (const key of Object.keys(changes) as (keyof SceneNode)[]) {
      if (key === 'overrides' || key === 'componentId' || key === 'componentLineageId') continue
      const overrideKey = instanceOverrideKey(lineageId, key)
      const legacyKey = `${node.id}:${key}`
      const nextValue = changes[key]
      if (valuesEqual(nextValue, source[key])) {
        delete next[overrideKey]
        delete next[legacyKey]
      } else {
        next[overrideKey] = clonedValue(nextValue)
        delete next[legacyKey]
      }
    }

    ctx.graph.updateNode(instance.id, { overrides: next })
    return { instanceId: instance.id, previous, next }
  }

  function snapshotNode(node: SceneNode, changedKeys: (keyof SceneNode)[]) {
    const snapshot: Partial<SceneNode> = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    }
    const writable = snapshot as Record<keyof SceneNode, SceneNode[keyof SceneNode]>
    for (const key of changedKeys) writable[key] = clonedValue(node[key])
    return snapshot
  }

  function autoMeasureTextChanges(id: string, changes: Partial<SceneNode>) {
    const nodeBefore = ctx.graph.getNode(id)
    if (
      nodeBefore?.type === 'TEXT' &&
      (changes.fontSize !== undefined ||
        changes.fontFamily !== undefined ||
        changes.letterSpacing !== undefined ||
        changes.lineHeight !== undefined ||
        changes.text !== undefined ||
        changes.textAutoResize !== undefined)
    ) {
      const merged = { ...nodeBefore, ...changes }
      const autoResize = changes.textAutoResize ?? nodeBefore.textAutoResize ?? 'WIDTH_AND_HEIGHT'
      const renderer = ctx.getRenderer()
      const measured = renderer?.measureTextNode?.(merged as SceneNode)
      if (measured) {
        if (autoResize === 'WIDTH_AND_HEIGHT' && changes.width === undefined) {
          changes.width = Math.max(1, measured.width)
          changes.height = Math.max(1, measured.height)
        } else if (autoResize === 'HEIGHT' && changes.height === undefined) {
          changes.height = Math.max(1, measured.height)
        }
      }
    }
  }

  function updateNode(id: string, changes: Partial<SceneNode>) {
    autoMeasureTextChanges(id, changes)
    const before = ctx.graph.getNode(id)
    if (before) recordOverrides(before, changes)
    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    const node = ctx.graph.getNode(id)
    if (node?.type === 'COMPONENT' && node.parentId) {
      const parent = ctx.graph.getNode(node.parentId)
      if (parent?.type === 'COMPONENT_SET') {
        fitComponentSetBounds(ctx.graph, parent.id)
      }
    }

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const n = ctx.graph.getNode(id)
      if (n) te.rebuildParagraph(n)
    }
  }

  function updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label = 'Update') {
    autoMeasureTextChanges(id, changes)
    const node = ctx.graph.getNode(id)
    if (!node) return

    const parentId = node.parentId
    const parent = parentId ? ctx.graph.getNode(parentId) : null
    const isVariant = node.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET'
    const changedKeys = Object.keys(changes) as (keyof SceneNode)[]

    const affectedNodeIds: string[] = []
    if (isVariant && parent) {
      affectedNodeIds.push(parent.id)
      for (const cid of parent.childIds) {
        affectedNodeIds.push(cid)
      }
    } else {
      affectedNodeIds.push(id)
    }

    const previousStates = affectedNodeIds.map((nid) => {
      const n = ctx.graph.getNode(nid)
      return {
        id: nid,
        state: n ? snapshotNode(n, nid === id ? changedKeys : []) : null
      }
    })

    const overrideChange = recordOverrides(node, changes)
    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    if (isVariant && parent) {
      fitComponentSetBounds(ctx.graph, parent.id)
    }

    const finalStates = affectedNodeIds.map((nid) => {
      const n = ctx.graph.getNode(nid)
      return {
        id: nid,
        state: n ? snapshotNode(n, nid === id ? changedKeys : []) : null
      }
    })

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const n = ctx.graph.getNode(id)
      if (n) te.rebuildParagraph(n)
    }

    ctx.undo.push({
      label,
      forward: () => {
        if (overrideChange) {
          ctx.graph.updateNode(overrideChange.instanceId, { overrides: overrideChange.next })
        }
        for (const fs of finalStates) {
          if (fs.state) ctx.graph.updateNode(fs.id, fs.state)
        }
        ctx.runLayoutForNode(id)
        if (te && te.nodeId === id) {
          const n = ctx.graph.getNode(id)
          if (n) te.rebuildParagraph(n)
        }
      },
      inverse: () => {
        if (overrideChange) {
          ctx.graph.updateNode(overrideChange.instanceId, { overrides: overrideChange.previous })
        }
        for (const ps of previousStates) {
          if (ps.state) ctx.graph.updateNode(ps.id, ps.state)
        }
        ctx.runLayoutForNode(id)
        if (te && te.nodeId === id) {
          const n = ctx.graph.getNode(id)
          if (n) te.rebuildParagraph(n)
        }
      }
    })
    ctx.requestRender()
  }

  function toggleMaskSelected(): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (node && !node.locked) {
        updateNodeWithUndo(id, { isMask: !node.isMask }, node.isMask ? 'Unmask' : 'Use as Mask')
      }
    }
    return true
  }

  function applyColorToSelected(color: Color, target: 'FILL' | 'STROKE' = 'FILL'): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (node && !node.locked) {
        if (target === 'FILL') {
          updateNodeWithUndo(
            id,
            { fills: [{ type: 'SOLID', color, opacity: color.a ?? 1, visible: true }] },
            'Apply Color'
          )
        } else {
          updateNodeWithUndo(
            id,
            {
              strokes: [
                {
                  type: 'SOLID',
                  color,
                  opacity: color.a ?? 1,
                  visible: true,
                  weight: 1,
                  align: 'INSIDE'
                }
              ]
            },
            'Apply Stroke Color'
          )
        }
      }
    }
    return true
  }

  function setAsThumbnailSelected(): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    const page = ctx.graph.getNode(ctx.state.currentPageId)
    if (!page) return false

    const targetId = selectedIds[0]
    for (const childId of page.childIds) {
      if (childId !== targetId) {
        const node = ctx.graph.getNode(childId)
        if (node?.isThumbnail) {
          ctx.graph.updateNode(childId, { isThumbnail: false })
        }
      }
    }

    updateNodeWithUndo(targetId, { isThumbnail: true }, 'Set as Thumbnail')
    return true
  }

  /**
   * Mixed selection color editing — set a uniform fill color across all selected nodes
   * regardless of their existing fill type, blending across RECTANGLE, ELLIPSE, TEXT, FRAME etc.
   */
  function setFillColorForSelection(color: Color): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    ctx.graph.beginBatch?.()
    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node) continue
      const existingFills = node.fills ?? []
      const updatedFills = existingFills.length > 0
        ? existingFills.map((f, i) => i === 0 ? { ...f, type: 'SOLID' as const, color, opacity: color.a } : f)
        : [{ type: 'SOLID' as const, color, opacity: color.a, visible: true }]
      ctx.graph.updateNode(id, { fills: updatedFills })
    }
    ctx.graph.endBatch?.()
    ctx.undo.snapshot('Set Fill Color (Mixed Selection)')
    return true
  }

  /**
   * Apply image filter adjustments (exposure, contrast, saturation, hue, etc.)
   * to the first image fill of each selected node.
   */
  function applyImageFiltersToSelected(filters: Record<string, number>): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    let changed = false
    ctx.graph.beginBatch?.()
    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node) continue
      const imageFillIdx = (node.fills ?? []).findIndex((f) => f.type === 'IMAGE')
      if (imageFillIdx === -1) continue
      const fills = [...node.fills]
      fills[imageFillIdx] = {
        ...fills[imageFillIdx],
        filters: { ...fills[imageFillIdx].filters, ...filters }
      }
      ctx.graph.updateNode(id, { fills })
      changed = true
    }
    ctx.graph.endBatch?.()
    if (changed) ctx.undo.snapshot('Apply Image Filters')
    return changed
  }

  /**
   * Apply OpenType feature flags to selected text nodes.
   * e.g. { liga: true, tnum: true, ss01: true }
   */
  function applyOpenTypeFeaturesSelected(features: Record<string, boolean>): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    let changed = false
    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node || node.type !== 'TEXT') continue
      updateNodeWithUndo(id, {
        openTypeFeatures: { ...node.openTypeFeatures, ...features }
      }, 'Set OpenType Features')
      changed = true
    }
    return changed
  }

  /**
   * Apply variable font axis values to selected text nodes.
   * Stored as openTypeFeatures with numeric axis tag values (e.g. { wght: 700, wdth: 125 }).
   */
  function applyVariableFontAxesSelected(axes: Record<string, number>): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    let changed = false
    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node || node.type !== 'TEXT') continue
      updateNodeWithUndo(id, {
        openTypeFeatures: { ...node.openTypeFeatures, ...axes }
      }, 'Set Variable Font Axes')
      changed = true
    }
    return changed
  }

  return {
    updateNode,
    updateNodeWithUndo,
    toggleMaskSelected,
    applyColorToSelected,
    setAsThumbnailSelected,
    setFillColorForSelection,
    applyImageFiltersToSelected,
    applyOpenTypeFeaturesSelected,
    applyVariableFontAxesSelected,
    ...layoutModeActions,
    ...variableBindingActions,
    ...nudgeActions
  }
}
