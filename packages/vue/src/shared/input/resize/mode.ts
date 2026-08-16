import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'
import type { HandlePosition } from '#vue/shared/input/types'

function resolveTextResizeChanges(
  node: SceneNode,
  affectsWidth: boolean,
  affectsHeight: boolean,
  isCorner: boolean
): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {}
  if (node.type !== 'TEXT') return changes

  if (isCorner) {
    if (node.textAutoResize !== 'NONE') {
      changes.textAutoResize = 'NONE'
    }
  } else if (affectsWidth) {
    if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
      changes.textAutoResize = 'HEIGHT'
    }
  } else if (affectsHeight) {
    if (node.textAutoResize !== 'NONE') {
      changes.textAutoResize = 'NONE'
    }
  }
  return changes
}

function resolveFrameResizeChanges(
  node: SceneNode,
  affectsWidth: boolean,
  affectsHeight: boolean
): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {}
  if (!node.layoutMode || node.layoutMode === 'NONE') return changes

  if (affectsWidth) {
    if (node.layoutMode === 'HORIZONTAL' && node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'VERTICAL' && node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'GRID' && node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    }
  }
  if (affectsHeight) {
    if (node.layoutMode === 'VERTICAL' && node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'HORIZONTAL' && node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'GRID' && node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    }
  }
  return changes
}

function resolveChildWidthChanges(node: SceneNode, parent: SceneNode): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {}
  if (node.layoutAlign === 'STRETCH') changes.layoutAlign = 'INHERIT'
  if (parent.layoutMode === 'HORIZONTAL' && node.layoutGrow === 1) changes.layoutGrow = 0
  if (node.type === 'FRAME') {
    if (parent.layoutMode === 'HORIZONTAL' && node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (parent.layoutMode === 'VERTICAL' && node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    }
  }
  return changes
}

function resolveChildHeightChanges(node: SceneNode, parent: SceneNode): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {}
  if (parent.layoutMode === 'VERTICAL' && node.layoutGrow === 1) changes.layoutGrow = 0
  if (node.type === 'FRAME') {
    if (parent.layoutMode === 'VERTICAL' && node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (parent.layoutMode === 'HORIZONTAL' && node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    }
  }
  return changes
}

function resolveChildResizeChanges(
  node: SceneNode,
  affectsWidth: boolean,
  affectsHeight: boolean,
  graph: SceneGraph
): Partial<SceneNode> {
  if (!node.parentId) return {}
  const parent = graph.getNode(node.parentId)
  if (!parent || !parent.layoutMode || parent.layoutMode === 'NONE') return {}

  return {
    ...(affectsWidth ? resolveChildWidthChanges(node, parent) : {}),
    ...(affectsHeight ? resolveChildHeightChanges(node, parent) : {})
  }
}

export function resolveResizeModeChanges(
  node: SceneNode,
  handle: HandlePosition,
  graph: SceneGraph
): Partial<SceneNode> {
  const affectsWidth = handle.includes('w') || handle.includes('e')
  const affectsHeight =
    handle === 'n' ||
    handle === 's' ||
    handle === 'nw' ||
    handle === 'ne' ||
    handle === 'sw' ||
    handle === 'se'
  const isCorner =
    handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se'

  return {
    ...resolveTextResizeChanges(node, affectsWidth, affectsHeight, isCorner),
    ...resolveFrameResizeChanges(node, affectsWidth, affectsHeight),
    ...resolveChildResizeChanges(node, affectsWidth, affectsHeight, graph)
  }
}
