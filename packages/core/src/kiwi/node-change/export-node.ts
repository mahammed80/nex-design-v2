import type { NodeChange, Paint } from '#core/kiwi/binary/codec'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyValue,
  SceneGraph,
  SceneNode
} from '#core/scene-graph'
import type { Color, GUID, Matrix } from '#core/types'

import { mergePluginData, serializePluginRelaunchData } from './plugin-data'

export type KiwiNodeChange = NodeChange & Record<string, unknown>

interface SceneNodeToKiwiContext {
  graph: SceneGraph
  blobs: Uint8Array[]
  nodeIdToGuid?: Map<string, GUID>
  fontDigestMap?: Map<string, Uint8Array>
  varIdToGuid?: Map<string, GUID>
  propertyIdToGuid?: Map<string, GUID>
  fractionalPosition: (index: number) => string
  mapToFigmaType: (type: SceneNode['type']) => string
  fillToKiwiPaint: (fill: SceneNode['fills'][number]) => Paint
  safeColor: (color: { r: number; g: number; b: number; a?: number }) => Color
  computeExportTransform: (node: SceneNode, graph: SceneGraph) => Matrix
  serializeCornerRadii: (node: SceneNode, nc: KiwiNodeChange) => void
  serializeTextProps: (
    node: SceneNode,
    nc: KiwiNodeChange,
    graph: SceneGraph,
    fontDigestMap?: Map<string, Uint8Array>
  ) => void
  serializeLayoutProps: (node: SceneNode, nc: KiwiNodeChange) => void
  serializeGeometry: (node: SceneNode, nc: KiwiNodeChange, blobs: Uint8Array[]) => void
  serializeVariableBindings: (
    node: SceneNode,
    nc: KiwiNodeChange,
    graph: SceneGraph,
    varIdToGuid?: Map<string, GUID>
  ) => void
  sceneNodeToKiwi: (
    node: SceneNode,
    parentGuid: GUID,
    childIndex: number,
    localIdCounter: { value: number },
    context: SceneNodeToKiwiContext
  ) => KiwiNodeChange[]
}

const DEFAULT_STROKE_WEIGHT = 1

function getOrCreateNodeGuid(
  context: SceneNodeToKiwiContext,
  nodeId: string,
  localIdCounter: { value: number }
): GUID {
  const existing = context.nodeIdToGuid?.get(nodeId)
  if (existing) return existing
  const guid = { sessionID: 1, localID: localIdCounter.value++ }
  context.nodeIdToGuid?.set(nodeId, guid)
  return guid
}

function getOrCreatePropertyGuid(
  context: SceneNodeToKiwiContext,
  propertyId: string,
  localIdCounter: { value: number }
): GUID {
  const existing = context.propertyIdToGuid?.get(propertyId)
  if (existing) return existing
  const match = propertyId.match(/^(\d+):(\d+)$/)
  const guid = match
    ? { sessionID: Number(match[1]), localID: Number(match[2]) }
    : { sessionID: 1, localID: localIdCounter.value++ }
  context.propertyIdToGuid?.set(propertyId, guid)
  return guid
}

function componentPropertyValueToKiwi(
  definition: ComponentPropertyDefinition,
  value: ComponentPropertyValue,
  context: SceneNodeToKiwiContext,
  localIdCounter: { value: number }
): Record<string, unknown> {
  if (definition.type === 'BOOLEAN') return { boolValue: value === true || value === 'true' }
  if (definition.type === 'INSTANCE_SWAP' && typeof value === 'string') {
    const target = context.graph.getNode(value)
    if (target) return { guidValue: getOrCreateNodeGuid(context, target.id, localIdCounter) }
    const match = value.match(/^(\d+):(\d+)$/)
    if (match) return { guidValue: { sessionID: Number(match[1]), localID: Number(match[2]) } }
  }
  return { textValue: { characters: String(value) } }
}

function propertyDefinitionsForNode(
  context: SceneNodeToKiwiContext,
  node: SceneNode
): ComponentPropertyDefinition[] {
  if (node.componentPropertyDefinitions.length > 0) return node.componentPropertyDefinitions
  if (!node.componentId) return []
  const component = context.graph.getNode(node.componentId)
  if (!component) return []
  const parent = component.parentId ? context.graph.getNode(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET'
    ? parent.componentPropertyDefinitions
    : component.componentPropertyDefinitions
}

function applyComponentMetadata(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  if (node.type === 'COMPONENT_SET') {
    nc.isStateGroup = true
    const orders = node.componentPropertyDefinitions
      .filter((definition) => definition.type === 'VARIANT' && definition.variantOptions?.length)
      .map((definition) => ({
        property: definition.name,
        values: [...(definition.variantOptions ?? [])]
      }))
    if (orders.length > 0) nc.stateGroupPropertyValueOrders = orders
  }

  if (node.type === 'INSTANCE' && node.componentId) {
    nc.symbolData = {
      symbolID: getOrCreateNodeGuid(context, node.componentId, localIdCounter)
    }
  }

  if (node.componentPropertyDefinitions.length > 0) {
    nc.componentPropDefs = node.componentPropertyDefinitions.map((definition, index) => ({
      id: getOrCreatePropertyGuid(context, definition.id, localIdCounter),
      name: definition.name,
      type: definition.type === 'BOOLEAN' ? 'BOOL' : definition.type,
      initialValue: componentPropertyValueToKiwi(
        definition,
        definition.defaultValue,
        context,
        localIdCounter
      ),
      sortPosition: context.fractionalPosition(index),
      preferredValues:
        definition.type === 'VARIANT' && definition.variantOptions?.length
          ? { stringValues: [...definition.variantOptions] }
          : undefined
    }))
  }

  if (node.componentPropertyReferences.length > 0) {
    const nodeFields = {
      TEXT: 'TEXT_DATA',
      BOOLEAN: 'VISIBLE',
      INSTANCE_SWAP: 'OVERRIDDEN_SYMBOL_ID'
    } as const
    nc.componentPropRefs = node.componentPropertyReferences.map((reference) => ({
      defID: getOrCreatePropertyGuid(context, reference.propertyId, localIdCounter),
      componentPropNodeField: nodeFields[reference.field]
    }))
  }

  if (node.type !== 'INSTANCE') return
  const definitions = propertyDefinitionsForNode(context, node)
  const assignments = Object.entries(node.componentPropertyValues).flatMap(([key, value]) => {
    const definition = definitions.find(
      (candidate) => candidate.id === key || candidate.name === key
    )
    if (!definition) return []
    return [
      {
        defID: getOrCreatePropertyGuid(context, definition.id, localIdCounter),
        value: componentPropertyValueToKiwi(definition, value, context, localIdCounter)
      }
    ]
  })
  if (assignments.length > 0) nc.componentPropAssignments = assignments
}

function createStrokePaints(context: SceneNodeToKiwiContext, node: SceneNode): Paint[] {
  return node.strokes.map((stroke) => ({
    type: 'SOLID',
    color: context.safeColor(stroke.color),
    opacity: stroke.opacity,
    visible: stroke.visible,
    blendMode: 'NORMAL'
  }))
}

function applyNodeVisualProps(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  if (node.independentStrokeWeights) {
    nc.borderStrokeWeightsIndependent = true
    nc.borderTopWeight = node.borderTopWeight
    nc.borderRightWeight = node.borderRightWeight
    nc.borderBottomWeight = node.borderBottomWeight
    nc.borderLeftWeight = node.borderLeftWeight
  }

  if (node.fills.length > 0) nc.fillPaints = node.fills.map(context.fillToKiwiPaint)

  context.serializeCornerRadii(node, nc)

  if (node.effects.length > 0) {
    nc.effects = node.effects.map((effect) => ({
      type: effect.type === 'LAYER_BLUR' ? 'FOREGROUND_BLUR' : effect.type,
      color: context.safeColor(effect.color),
      offset: effect.offset,
      radius: effect.radius,
      spread: effect.spread,
      visible: effect.visible
    }))
  }

  if (node.type === 'TEXT') {
    context.serializeTextProps(node, nc, context.graph, context.fontDigestMap)
  }

  nc.frameMaskDisabled = !node.clipsContent
  if (node.horizontalConstraint !== 'MIN') nc.horizontalConstraint = node.horizontalConstraint
  if (node.verticalConstraint !== 'MIN') nc.verticalConstraint = node.verticalConstraint
  if (node.strokeCap !== 'NONE') nc.strokeCap = node.strokeCap
  if (node.strokeJoin !== 'MITER') nc.strokeJoin = node.strokeJoin
  if (node.strokeMiterLimit !== 28.96) nc.miterLimit = node.strokeMiterLimit
  if (node.dashPattern.length > 0) nc.dashPattern = node.dashPattern
  if (node.arcData) {
    nc.arcData = {
      startingAngle: node.arcData.startingAngle,
      endingAngle: node.arcData.endingAngle,
      innerRadius: node.arcData.innerRadius
    }
  }
  if (!node.autoRename) nc.autoRename = false
}

export function sceneNodeToKiwiWithContext(
  node: SceneNode,
  parentGuid: GUID,
  childIndex: number,
  localIdCounter: { value: number },
  context: SceneNodeToKiwiContext
): KiwiNodeChange[] {
  const guid = getOrCreateNodeGuid(context, node.id, localIdCounter)

  const strokePaints = createStrokePaints(context, node)

  const nc: KiwiNodeChange = {
    guid,
    parentIndex: { guid: parentGuid, position: context.fractionalPosition(childIndex) },
    type: context.mapToFigmaType(node.type),
    name: node.name,
    visible: node.visible,
    opacity: node.opacity,
    phase: 'CREATED',
    size: { x: node.width, y: node.height },
    transform: context.computeExportTransform(node, context.graph),
    strokeWeight: node.strokes[0]?.weight ?? DEFAULT_STROKE_WEIGHT,
    strokeAlign: node.strokes[0]?.align ?? 'INSIDE'
  }

  applyNodeVisualProps(context, node, nc)
  if (strokePaints.length > 0) nc.strokePaints = strokePaints
  if (node.scrollDirection !== 'NONE') nc.scrollDirection = node.scrollDirection
  if (node.scrollBehavior !== 'SCROLLS') nc.scrollBehavior = node.scrollBehavior
  if (node.prototypeDevice) nc.prototypeDevice = structuredClone(node.prototypeDevice)
  applyComponentMetadata(context, node, nc, localIdCounter)

  context.serializeLayoutProps(node, nc)
  context.serializeGeometry(node, nc, context.blobs)
  context.serializeVariableBindings(node, nc, context.graph, context.varIdToGuid)

  const pluginData = mergePluginData(node.pluginData)
  if (pluginData.length > 0) nc.pluginData = pluginData
  if (node.pluginRelaunchData.length > 0) {
    nc.pluginRelaunchData = serializePluginRelaunchData(node.pluginRelaunchData)
  }

  const result: KiwiNodeChange[] = [nc]
  const children = context.graph.getChildren(node.id)
  for (let i = 0; i < children.length; i++) {
    result.push(...context.sceneNodeToKiwi(children[i], guid, i, localIdCounter, context))
  }
  return result
}
