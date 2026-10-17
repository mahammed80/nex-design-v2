import type { EditorContext } from '#core/editor/types'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyReferenceField,
  ComponentPropertyValue,
  SceneNode
} from '#core/scene-graph'

function componentForInstance(ctx: EditorContext, instance: SceneNode): SceneNode | undefined {
  if (instance.type !== 'INSTANCE' || !instance.componentId) return undefined
  const component = ctx.graph.getNode(instance.componentId)
  return component?.type === 'COMPONENT' ? component : undefined
}

function definitionsForComponent(
  ctx: EditorContext,
  component: SceneNode
): ComponentPropertyDefinition[] {
  const parent = component.parentId ? ctx.graph.getNode(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET'
    ? parent.componentPropertyDefinitions
    : component.componentPropertyDefinitions
}

function findDefinition(
  definitions: ComponentPropertyDefinition[],
  propertyIdOrName: string
): ComponentPropertyDefinition | undefined {
  return definitions.find(
    (definition) => definition.id === propertyIdOrName || definition.name === propertyIdOrName
  )
}

function descendants(ctx: EditorContext, rootId: string): SceneNode[] {
  const result: SceneNode[] = []
  const visit = (parentId: string) => {
    for (const child of ctx.graph.getChildren(parentId)) {
      result.push(child)
      visit(child.id)
    }
  }
  visit(rootId)
  return result
}

function findBoundInstanceNode(
  ctx: EditorContext,
  instanceId: string,
  source: SceneNode
): SceneNode | undefined {
  return descendants(ctx, instanceId).find(
    (candidate) =>
      candidate.componentId === source.id ||
      (source.componentLineageId !== null &&
        candidate.componentLineageId === source.componentLineageId) ||
      (candidate.type === source.type && candidate.name === source.name)
  )
}

function applyReference(
  ctx: EditorContext,
  target: SceneNode,
  field: ComponentPropertyReferenceField,
  value: ComponentPropertyValue
): void {
  if (field === 'TEXT' && target.type === 'TEXT') {
    ctx.graph.updateNode(target.id, { text: String(value) })
    return
  }
  if (field === 'BOOLEAN') {
    ctx.graph.updateNode(target.id, { visible: value === true || value === 'true' })
    return
  }
  if (field !== 'INSTANCE_SWAP' || target.type !== 'INSTANCE' || typeof value !== 'string') {
    return
  }
  const component = ctx.graph.getNode(value)
  if (component?.type === 'COMPONENT') ctx.graph.switchInstanceComponent(target.id, component.id)
}

function applyComponentPropertyBindings(
  ctx: EditorContext,
  instanceId: string,
  values?: Record<string, ComponentPropertyValue>
): void {
  const instance = ctx.graph.getNode(instanceId)
  if (!instance) return
  const component = componentForInstance(ctx, instance)
  if (!component) return
  const definitions = definitionsForComponent(ctx, component)
  const propertyValues = values ?? instance.componentPropertyValues

  for (const source of descendants(ctx, component.id)) {
    if (source.componentPropertyReferences.length === 0) continue
    const target = findBoundInstanceNode(ctx, instance.id, source)
    if (!target) continue
    for (const reference of source.componentPropertyReferences) {
      const definition = findDefinition(definitions, reference.propertyId)
      if (!definition) continue
      const value =
        propertyValues[definition.name] ?? propertyValues[definition.id] ?? definition.defaultValue
      applyReference(ctx, target, reference.field, value)
    }
  }
}

function containingComponent(ctx: EditorContext, nodeId: string): SceneNode | undefined {
  let current = ctx.graph.getNode(nodeId)
  while (current) {
    if (current.type === 'COMPONENT') return current
    current = current.parentId ? ctx.graph.getNode(current.parentId) : undefined
  }
  return undefined
}

function expectedReferenceField(type: ComponentPropertyDefinition['type']) {
  if (type === 'TEXT') return 'TEXT'
  if (type === 'BOOLEAN') return 'BOOLEAN'
  if (type === 'INSTANCE_SWAP') return 'INSTANCE_SWAP'
  return undefined
}

export function createComponentPropertyActions(ctx: EditorContext) {
  function bindComponentProperty(
    definitionOwnerId: string,
    targetNodeId: string,
    propertyId: string,
    field: ComponentPropertyReferenceField
  ): boolean {
    const owner = ctx.graph.getNode(definitionOwnerId)
    const target = ctx.graph.getNode(targetNodeId)
    if (!owner || !target || !ctx.graph.isDescendant(target.id, owner.id)) return false
    const definition = owner.componentPropertyDefinitions.find(
      (candidate) => candidate.id === propertyId
    )
    if (!definition || expectedReferenceField(definition.type) !== field) return false
    if (field === 'TEXT' && target.type !== 'TEXT') return false
    if (field === 'INSTANCE_SWAP' && target.type !== 'INSTANCE') return false

    const previous = structuredClone(target.componentPropertyReferences)
    const next = [
      ...previous.filter((reference) => reference.field !== field),
      { propertyId, field }
    ]
    const apply = (references: SceneNode['componentPropertyReferences']) => {
      ctx.graph.updateNode(target.id, { componentPropertyReferences: references })
      const component = containingComponent(ctx, target.id)
      if (component) {
        for (const instance of ctx.graph.getInstances(component.id)) {
          applyComponentPropertyBindings(ctx, instance.id)
        }
      }
      ctx.requestRender()
    }

    apply(next)
    ctx.undo.push({
      label: 'Bind component property',
      forward: () => apply(next),
      inverse: () => apply(previous)
    })
    return true
  }

  function unbindComponentProperty(targetNodeId: string, field: ComponentPropertyReferenceField) {
    const target = ctx.graph.getNode(targetNodeId)
    if (!target) return false
    const previous = structuredClone(target.componentPropertyReferences)
    const next = previous.filter((reference) => reference.field !== field)
    if (next.length === previous.length) return false
    const apply = (references: SceneNode['componentPropertyReferences']) => {
      ctx.graph.updateNode(target.id, { componentPropertyReferences: references })
      ctx.requestRender()
    }
    apply(next)
    ctx.undo.push({
      label: 'Unbind component property',
      forward: () => apply(next),
      inverse: () => apply(previous)
    })
    return true
  }

  function setComponentPropertyValue(
    instanceId: string,
    propertyIdOrName: string,
    value: ComponentPropertyValue
  ): boolean {
    const instance = ctx.graph.getNode(instanceId)
    if (!instance) return false
    const component = componentForInstance(ctx, instance)
    if (!component) return false
    const definition = findDefinition(definitionsForComponent(ctx, component), propertyIdOrName)
    if (!definition || definition.type === 'VARIANT') return false
    if (definition.type === 'BOOLEAN' && typeof value !== 'boolean') return false
    if (definition.type !== 'BOOLEAN' && typeof value !== 'string') return false

    const previous = structuredClone(instance.componentPropertyValues)
    const next = { ...previous, [definition.name]: value }
    const apply = (values: SceneNode['componentPropertyValues']) => {
      ctx.graph.updateNode(instance.id, { componentPropertyValues: values })
      applyComponentPropertyBindings(ctx, instance.id, values)
      ctx.requestRender()
    }

    apply(next)
    ctx.undo.push({
      label: 'Set component property',
      forward: () => apply(next),
      inverse: () => apply(previous)
    })
    return true
  }

  function resetInstanceOverrides(instanceId: string): boolean {
    const instance = ctx.graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE') return false
    const previousOverrides = structuredClone(instance.overrides)
    const previousValues = structuredClone(instance.componentPropertyValues)
    const apply = (
      overrides: SceneNode['overrides'],
      values: SceneNode['componentPropertyValues']
    ) => {
      ctx.graph.updateNode(instance.id, {
        overrides,
        componentPropertyValues: values
      })
      applyComponentPropertyBindings(ctx, instance.id, values)
      ctx.requestRender()
    }

    apply({}, {})
    ctx.undo.push({
      label: 'Reset instance overrides',
      forward: () => apply({}, {}),
      inverse: () => apply(previousOverrides, previousValues)
    })
    return true
  }

  return {
    applyComponentPropertyBindings: (instanceId: string) =>
      applyComponentPropertyBindings(ctx, instanceId),
    bindComponentProperty,
    unbindComponentProperty,
    setComponentPropertyValue,
    resetInstanceOverrides
  }
}
