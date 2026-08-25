import type { SceneNode } from '#core/scene-graph'
import { instanceOverrideKey } from '#core/scene-graph/instances'

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

  function updateNode(id: string, changes: Partial<SceneNode>) {
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

  return {
    updateNode,
    updateNodeWithUndo,
    ...layoutModeActions,
    ...variableBindingActions,
    ...nudgeActions
  }
}
