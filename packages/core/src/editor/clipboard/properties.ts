import type { EditorContext } from '#core/editor/types'
import { computeAllLayouts } from '#core/layout'
import { copyEffects, copyFills, copyStrokes } from '#core/scene-graph'
import type { Effect, Fill, SceneNode, Stroke } from '#core/scene-graph'

export interface CopiedProperties {
  fills?: Fill[]
  strokes?: Stroke[]
  strokeWeight?: number
  strokeAlign?: 'CENTER' | 'INSIDE' | 'OUTSIDE'
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE' | 'LINE_ARROW' | 'TRIANGLE_ARROW'
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND'
  dashPattern?: number[]
  effects?: Effect[]
  opacity?: number
  blendMode?: SceneNode['blendMode']
  cornerRadius?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' }
  letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' }
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  italic?: boolean
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
}

let copiedPropertiesStore: CopiedProperties | null = null

export function getCopiedProperties(): CopiedProperties | null {
  if (!copiedPropertiesStore) return null
  return {
    ...copiedPropertiesStore,
    fills: copiedPropertiesStore.fills ? copyFills(copiedPropertiesStore.fills) : undefined,
    strokes: copiedPropertiesStore.strokes ? copyStrokes(copiedPropertiesStore.strokes) : undefined,
    effects: copiedPropertiesStore.effects ? copyEffects(copiedPropertiesStore.effects) : undefined
  }
}

export function setCopiedProperties(props: CopiedProperties | null): void {
  if (!props) {
    copiedPropertiesStore = null
    return
  }
  copiedPropertiesStore = {
    ...props,
    fills: props.fills ? copyFills(props.fills) : undefined,
    strokes: props.strokes ? copyStrokes(props.strokes) : undefined,
    effects: props.effects ? copyEffects(props.effects) : undefined
  }
}

function extractNodeProperties(sourceNode: SceneNode): CopiedProperties {
  const props: CopiedProperties = {
    fills: sourceNode.fills ? copyFills(sourceNode.fills) : undefined,
    strokes: sourceNode.strokes ? copyStrokes(sourceNode.strokes) : undefined,
    strokeWeight: sourceNode.strokeWeight,
    strokeAlign: sourceNode.strokeAlign,
    strokeCap: sourceNode.strokeCap,
    strokeJoin: sourceNode.strokeJoin,
    dashPattern: sourceNode.dashPattern ? [...sourceNode.dashPattern] : undefined,
    effects: sourceNode.effects ? copyEffects(sourceNode.effects) : undefined,
    opacity: sourceNode.opacity,
    blendMode: sourceNode.blendMode,
    cornerRadius: sourceNode.cornerRadius
  }

  if (sourceNode.type === 'TEXT') {
    props.fontFamily = sourceNode.fontFamily
    props.fontSize = sourceNode.fontSize
    props.fontWeight = sourceNode.fontWeight
    props.lineHeight = sourceNode.lineHeight ? structuredClone(sourceNode.lineHeight) : undefined
    props.letterSpacing = sourceNode.letterSpacing
      ? structuredClone(sourceNode.letterSpacing)
      : undefined
    props.textAlignHorizontal = sourceNode.textAlignHorizontal
    props.textAlignVertical = sourceNode.textAlignVertical
    props.italic = sourceNode.italic
    props.textDecoration = sourceNode.textDecoration
  }

  return props
}

function applyCommonStyling(updates: Partial<SceneNode>, node: SceneNode, props: CopiedProperties) {
  if (props.fills !== undefined) updates.fills = copyFills(props.fills)
  if (props.strokes !== undefined) updates.strokes = copyStrokes(props.strokes)
  if (props.strokeWeight !== undefined) updates.strokeWeight = props.strokeWeight
  if (props.strokeAlign !== undefined) updates.strokeAlign = props.strokeAlign
  if (props.strokeCap !== undefined) updates.strokeCap = props.strokeCap
  if (props.strokeJoin !== undefined) updates.strokeJoin = props.strokeJoin
  if (props.dashPattern !== undefined) updates.dashPattern = [...props.dashPattern]
  if (props.effects !== undefined) updates.effects = copyEffects(props.effects)
  if (props.opacity !== undefined) updates.opacity = props.opacity
  if (props.blendMode !== undefined) updates.blendMode = props.blendMode
  if (props.cornerRadius !== undefined && 'cornerRadius' in node) {
    updates.cornerRadius = props.cornerRadius
  }
}

function applyTypographyStyling(updates: Partial<SceneNode>, props: CopiedProperties) {
  if (props.fontFamily !== undefined) updates.fontFamily = props.fontFamily
  if (props.fontSize !== undefined) updates.fontSize = props.fontSize
  if (props.fontWeight !== undefined) updates.fontWeight = props.fontWeight
  if (props.lineHeight !== undefined) updates.lineHeight = structuredClone(props.lineHeight)
  if (props.letterSpacing !== undefined) {
    updates.letterSpacing = structuredClone(props.letterSpacing)
  }
  if (props.textAlignHorizontal !== undefined) {
    updates.textAlignHorizontal = props.textAlignHorizontal
  }
  if (props.textAlignVertical !== undefined) {
    updates.textAlignVertical = props.textAlignVertical
  }
  if (props.italic !== undefined) updates.italic = props.italic
  if (props.textDecoration !== undefined) updates.textDecoration = props.textDecoration
}

function buildTargetUpdates(node: SceneNode, props: CopiedProperties): Partial<SceneNode> {
  const updates: Partial<SceneNode> = {}
  applyCommonStyling(updates, node, props)
  if (node.type === 'TEXT') {
    applyTypographyStyling(updates, props)
  }
  return updates
}

export function createClipboardPropertyActions(ctx: EditorContext) {
  function copyProperties(): boolean {
    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    const sourceNode = ctx.graph.getNode(selectedIds[0])
    if (!sourceNode) return false

    setCopiedProperties(extractNodeProperties(sourceNode))
    return true
  }

  function pasteProperties(): boolean {
    const props = getCopiedProperties()
    if (!props) return false

    const selectedIds = [...ctx.state.selectedIds]
    if (selectedIds.length === 0) return false

    const beforeSnapshots = new Map<string, SceneNode>()
    const afterSnapshots = new Map<string, SceneNode>()

    for (const id of selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node || node.locked) continue

      beforeSnapshots.set(id, structuredClone(node))
      ctx.graph.updateNode(id, buildTargetUpdates(node, props))

      const updated = ctx.graph.getNode(id)
      if (updated) afterSnapshots.set(id, structuredClone(updated))
    }

    if (beforeSnapshots.size === 0) return false

    computeAllLayouts(ctx.graph, ctx.state.currentPageId)
    ctx.requestRender()

    ctx.undo.push({
      label: 'Paste Properties',
      forward: () => {
        for (const [id, snap] of afterSnapshots) ctx.graph.updateNode(id, snap)
        computeAllLayouts(ctx.graph, ctx.state.currentPageId)
        ctx.requestRender()
      },
      inverse: () => {
        for (const [id, snap] of beforeSnapshots) ctx.graph.updateNode(id, snap)
        computeAllLayouts(ctx.graph, ctx.state.currentPageId)
        ctx.requestRender()
      }
    })

    return true
  }

  return { copyProperties, pasteProperties }
}
