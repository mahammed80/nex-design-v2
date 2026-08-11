import type { EditorContext } from '#core/editor/types'
import { randomHex } from '#core/random'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyType,
  SceneNode,
  SceneGraph
} from '#core/scene-graph'
import { copyFills, copyStrokes, copyEffects } from '#core/scene-graph/copy'

export function fitComponentSetBounds(graph: SceneGraph, componentSetId: string): void {
  const compSet = graph.getNode(componentSetId)
  if (!compSet || compSet.type !== 'COMPONENT_SET') return

  const variants = compSet.childIds
    .map((id) => graph.getNode(id))
    .filter((n): n is SceneNode => !!n && n.type === 'COMPONENT')

  if (variants.length === 0) {
    graph.updateNode(componentSetId, {
      width: 100,
      height: 100
    })
    return
  }

  variants.sort((a, b) => a.x - b.x)

  const padding = 20
  const gap = 20
  let currentX = padding
  let maxHeight = 0

  for (const v of variants) {
    graph.updateNode(v.id, {
      x: currentX,
      y: padding
    })
    currentX += v.width + gap
    maxHeight = Math.max(maxHeight, v.height)
  }

  const finalWidth = currentX - gap + padding
  const finalHeight = maxHeight + padding * 2

  graph.updateNode(componentSetId, {
    width: finalWidth,
    height: finalHeight
  })
}

export function createVariantActions(ctx: EditorContext) {
  function getComponentSetPropertyDefs(componentSetId: string): ComponentPropertyDefinition[] {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []
    return node.componentPropertyDefinitions
  }

  function addPropertyDefinition(
    componentSetId: string,
    name: string,
    type: ComponentPropertyType = 'VARIANT',
    defaultValue = ''
  ): string | undefined {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return undefined
    const id = `prop:${randomHex(8)}`
    const def: ComponentPropertyDefinition = {
      id,
      name,
      type,
      defaultValue,
      variantOptions: type === 'VARIANT' ? [defaultValue] : undefined
    }
    const prevDefs = [...node.componentPropertyDefinitions]
    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: [...prevDefs, def]
    })
    ctx.undo.push({
      label: 'Add property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: [...n.componentPropertyDefinitions, def]
          })
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return id
  }

  function removePropertyDefinition(componentSetId: string, propertyId: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return
    const prevDefs = [...node.componentPropertyDefinitions]
    const def = prevDefs.find((d) => d.id === propertyId)
    if (!def) return
    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: prevDefs.filter((d) => d.id !== propertyId)
    })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = { ...child.componentPropertyValues }
      delete values[def.name]
      ctx.graph.updateNode(childId, { componentPropertyValues: values })
    }
    ctx.undo.push({
      label: 'Remove property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: n.componentPropertyDefinitions.filter(
              (d) => d.id !== propertyId
            )
          })
          for (const cid of n.childIds) {
            const c = ctx.graph.getNode(cid)
            if (!c) continue
            const v = { ...c.componentPropertyValues }
            delete v[def.name]
            ctx.graph.updateNode(cid, { componentPropertyValues: v })
          }
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function renamePropertyDefinition(componentSetId: string, propertyId: string, newName: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return
    const def = node.componentPropertyDefinitions.find((d) => d.id === propertyId)
    if (!def) return
    const prevName = def.name
    const newDefs = node.componentPropertyDefinitions.map((d) =>
      d.id === propertyId ? { ...d, name: newName } : d
    )
    ctx.graph.updateNode(componentSetId, { componentPropertyDefinitions: newDefs })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = { ...child.componentPropertyValues }
      if (prevName in values) {
        values[newName] = values[prevName]
        delete values[prevName]
        ctx.graph.updateNode(childId, { componentPropertyValues: values })
      }
    }
    ctx.undo.push({
      label: 'Rename property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: n.componentPropertyDefinitions.map((d) =>
              d.id === propertyId ? { ...d, name: newName } : d
            )
          })
        }
        ctx.requestRender()
      },
      inverse: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: n.componentPropertyDefinitions.map((d) =>
              d.id === propertyId ? { ...d, name: prevName } : d
            )
          })
        }
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function parseVariantName(name: string): Record<string, string> {
    const values: Record<string, string> = {}
    for (const part of name.split(',').map((s) => s.trim())) {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) continue
      values[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim()
    }
    return values
  }

  function buildVariantName(values: Record<string, string>): string {
    return Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
  }

  function collectVariantOptions(componentSetId: string): Map<string, Set<string>> {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return new Map()
    const options = new Map<string, Set<string>>()
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (child?.type !== 'COMPONENT') continue
      for (const [key, value] of Object.entries(child.componentPropertyValues)) {
        const set = options.get(key) ?? new Set()
        set.add(value)
        options.set(key, set)
      }
    }
    return options
  }

  function findVariantByValues(
    componentSetId: string,
    values: Record<string, string>
  ): SceneNode | undefined {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return undefined
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (child?.type !== 'COMPONENT') continue
      const childValues = child.componentPropertyValues
      const matches = Object.entries(values).every(([k, v]) => childValues[k] === v)
      if (matches) return child
    }
    return undefined
  }

  function switchInstanceVariant(instanceId: string, propertyName: string, newValue: string) {
    const instance = ctx.graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE' || !instance.componentId) return

    const component = ctx.graph.getNode(instance.componentId)
    if (!component) return
    const componentSetId = component.parentId
    if (!componentSetId) return
    const componentSet = ctx.graph.getNode(componentSetId)
    if (componentSet?.type !== 'COMPONENT_SET') return

    const currentValues = { ...component.componentPropertyValues }
    currentValues[propertyName] = newValue
    let target = findVariantByValues(componentSetId, currentValues)

    if (!target) {
      let bestScore = -1
      let bestTarget: SceneNode | undefined
      for (const childId of componentSet.childIds) {
        const child = ctx.graph.getNode(childId)
        if (child?.type !== 'COMPONENT') continue

        let score = 0
        const childValues = child.componentPropertyValues
        for (const [k, v] of Object.entries(currentValues)) {
          if (childValues[k] === v) {
            score += (k === propertyName) ? 10 : 1
          }
        }
        if (score > bestScore) {
          bestScore = score
          bestTarget = child
        }
      }
      target = bestTarget
    }

    if (!target || target.id === instance.componentId) return

    const prevComponentId = instance.componentId

    const runSwitch = (_fromId: string, toId: string) => {
      const inst = ctx.graph.getNode(instanceId)
      if (inst) {
        for (const cid of [...inst.childIds]) {
          ctx.graph.deleteNode(cid)
        }
      }
      ctx.graph.updateNode(instanceId, { componentId: toId })
      ctx.graph.populateInstanceChildren(instanceId, toId)
    }

    runSwitch(prevComponentId, target.id)

    ctx.undo.push({
      label: 'Switch variant',
      forward: () => {
        runSwitch(prevComponentId, target.id)
        ctx.requestRender()
      },
      inverse: () => {
        runSwitch(target.id, prevComponentId)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function generateVariantProps(
    defs: ComponentPropertyDefinition[],
    count: number
  ): Record<string, string> {
    const values: Record<string, string> = {}
    for (const def of defs) {
      if (def.type === 'VARIANT') {
        const nextVal = `Variant ${count}`
        values[def.name] = nextVal
        if (def.variantOptions && !def.variantOptions.includes(nextVal)) {
          def.variantOptions.push(nextVal)
        }
      } else {
        values[def.name] = def.defaultValue
      }
    }
    return values
  }

  function addVariantToComponentSet(
    componentSetId: string,
    customValues?: Record<string, string>
  ): string | undefined {
    const componentSet = ctx.graph.getNode(componentSetId)
    if (componentSet?.type !== 'COMPONENT_SET') return undefined

    const refChildId = componentSet.childIds[componentSet.childIds.length - 1]
    const refChild = refChildId ? ctx.graph.getNode(refChildId) : undefined
    const childCount = componentSet.childIds.length + 1

    const propValues = customValues || generateVariantProps(componentSet.componentPropertyDefinitions, childCount)
    const name = buildVariantName(propValues) || `Variant ${childCount}`

    let createdId: string | undefined

    const runCreate = () => {
      const newComponent = ctx.graph.createNode('COMPONENT', componentSetId, {
        name,
        x: refChild ? refChild.x + refChild.width + 20 : 20,
        y: refChild?.y ?? 20,
        width: refChild?.width ?? 100,
        height: refChild?.height ?? 40,
        fills: refChild?.fills
          ? copyFills(refChild.fills)
          : [
              { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.98, a: 1 }, opacity: 1, visible: true }
            ],
        strokes: refChild?.strokes ? copyStrokes(refChild.strokes) : [],
        effects: refChild?.effects ? copyEffects(refChild.effects) : [],
        componentPropertyValues: propValues
      })
      createdId = newComponent.id
      if (refChild) {
        const cloneSubtree = (sourceId: string, parentId: string) => {
          const srcNode = ctx.graph.getNode(sourceId)
          if (!srcNode) return
          for (const childId of srcNode.childIds) {
            const childNode = ctx.graph.getNode(childId)
            if (!childNode) continue
            const { id: _, parentId: _p, childIds: _c, fills, strokes, effects, ...rest } = childNode
            const clonedChild = ctx.graph.createNode(childNode.type, parentId, {
              ...rest,
              fills: fills ? copyFills(fills) : [],
              strokes: strokes ? copyStrokes(strokes) : [],
              effects: effects ? copyEffects(effects) : [],
              parentId,
              childIds: []
            })
            cloneSubtree(childId, clonedChild.id)
          }
        }
        cloneSubtree(refChild.id, newComponent.id)
      }
      fitComponentSetBounds(ctx.graph, componentSetId)
      return newComponent.id
    }

    const newId = runCreate()

    ctx.undo.push({
      label: 'Add variant',
      forward: () => {
        runCreate()
        if (createdId) ctx.setSelectedIds(new Set([createdId]))
        ctx.requestRender()
      },
      inverse: () => {
        if (createdId) {
          ctx.graph.deleteNode(createdId)
        }
        fitComponentSetBounds(ctx.graph, componentSetId)
        ctx.setSelectedIds(new Set([componentSetId]))
        ctx.requestRender()
      }
    })

    ctx.setSelectedIds(new Set([newId]))
    ctx.requestRender()
    return newId
  }

  function addVariantToStandaloneComponent(
    componentId: string,
    customValues?: Record<string, string>
  ): string | undefined {
    const component = ctx.graph.getNode(componentId)
    if (!component || component.type !== 'COMPONENT') return undefined

    const pageId = component.parentId ?? ctx.state.currentPageId
    const page = ctx.graph.getNode(pageId)
    if (!page) return undefined

    const padding = 20
    const componentSetWidth = component.width * 2 + 60
    const componentSetHeight = component.height + 40

    let createdSetId: string | undefined
    let createdVariantId: string | undefined
    const prevParentId = component.parentId
    const prevX = component.x
    const prevY = component.y
    const prevName = component.name
    const prevPropertyValues = component.componentPropertyValues

    const runWrap = () => {
      const compSet = ctx.graph.createNode('COMPONENT_SET', pageId, {
        name: component.name,
        x: component.x - padding,
        y: component.y - padding,
        width: componentSetWidth,
        height: componentSetHeight,
        componentPropertyDefinitions: [
          {
            id: `prop:${randomHex(8)}`,
            name: 'State',
            type: 'VARIANT',
            defaultValue: 'Default',
            variantOptions: ['Default', 'Variant 2']
          }
        ]
      })
      createdSetId = compSet.id

      ctx.graph.reparentNode(componentId, compSet.id)
      
      ctx.graph.updateNode(componentId, {
        x: padding,
        y: padding,
        componentPropertyValues: { State: 'Default' },
        name: 'State=Default'
      })

      const secondPropValues = customValues || { State: 'Variant 2' }
      const secondName = buildVariantName(secondPropValues) || 'State=Variant 2'

      const newVar = ctx.graph.createNode('COMPONENT', compSet.id, {
        name: secondName,
        x: padding + component.width + 20,
        y: padding,
        width: component.width,
        height: component.height,
        fills: component.fills ? copyFills(component.fills) : [],
        strokes: component.strokes ? copyStrokes(component.strokes) : [],
        effects: component.effects ? copyEffects(component.effects) : [],
        componentPropertyValues: secondPropValues
      })
      createdVariantId = newVar.id

      const cloneSubtree = (sourceId: string, parentId: string) => {
        const srcNode = ctx.graph.getNode(sourceId)
        if (!srcNode) return
        for (const childId of srcNode.childIds) {
          const childNode = ctx.graph.getNode(childId)
          if (!childNode) continue
          const { id: _, parentId: _p, childIds: _c, fills, strokes, effects, ...rest } = childNode
          const clonedChild = ctx.graph.createNode(childNode.type, parentId, {
            ...rest,
            fills: fills ? copyFills(fills) : [],
            strokes: strokes ? copyStrokes(strokes) : [],
            effects: effects ? copyEffects(effects) : [],
            parentId,
            childIds: []
          })
          cloneSubtree(childId, clonedChild.id)
        }
      }
      cloneSubtree(componentId, newVar.id)

      fitComponentSetBounds(ctx.graph, compSet.id)
    }

    runWrap()

    ctx.undo.push({
      label: 'Create variant set',
      forward: () => {
        runWrap()
        if (createdVariantId) ctx.setSelectedIds(new Set([createdVariantId]))
        ctx.requestRender()
      },
      inverse: () => {
        if (createdVariantId) {
          ctx.graph.deleteNode(createdVariantId)
        }
        if (createdSetId) {
          if (prevParentId) {
            ctx.graph.reparentNode(componentId, prevParentId)
          }
          ctx.graph.updateNode(componentId, {
            x: prevX,
            y: prevY,
            name: prevName,
            componentPropertyValues: prevPropertyValues
          })
          ctx.graph.deleteNode(createdSetId)
        }
        ctx.setSelectedIds(new Set([componentId]))
        ctx.requestRender()
      }
    })

    if (createdVariantId) ctx.setSelectedIds(new Set([createdVariantId]))
    ctx.requestRender()
    return createdVariantId
  }

  function renameVariantValue(
    componentSetId: string,
    propertyName: string,
    oldValue: string,
    newValue: string
  ) {
    if (!newValue || newValue.trim() === '') return
    const compSet = ctx.graph.getNode(componentSetId)
    if (compSet?.type !== 'COMPONENT_SET') return

    ctx.undo.push({
      label: 'Rename variant value',
      forward: () => {
        for (const childId of compSet.childIds) {
          const child = ctx.graph.getNode(childId)
          if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
            if (child.componentPropertyValues[propertyName] === oldValue) {
              const nextValues = { ...child.componentPropertyValues, [propertyName]: newValue }
              ctx.graph.updateNode(childId, {
                componentPropertyValues: nextValues,
                name: buildVariantName(nextValues)
              })
            }
          }
        }
        ctx.requestRender()
      },
      inverse: () => {
        for (const childId of compSet.childIds) {
          const child = ctx.graph.getNode(childId)
          if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
            if (child.componentPropertyValues[propertyName] === newValue) {
              const prevValues = { ...child.componentPropertyValues, [propertyName]: oldValue }
              ctx.graph.updateNode(childId, {
                componentPropertyValues: prevValues,
                name: buildVariantName(prevValues)
              })
            }
          }
        }
        ctx.requestRender()
      }
    })

    for (const childId of compSet.childIds) {
      const child = ctx.graph.getNode(childId)
      if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
        if (child.componentPropertyValues[propertyName] === oldValue) {
          const nextValues = { ...child.componentPropertyValues, [propertyName]: newValue }
          ctx.graph.updateNode(childId, {
            componentPropertyValues: nextValues,
            name: buildVariantName(nextValues)
          })
        }
      }
    }
    ctx.requestRender()
  }

  function deleteVariantValue(
    componentSetId: string,
    propertyName: string,
    valueToDelete: string
  ) {
    const compSet = ctx.graph.getNode(componentSetId)
    if (compSet?.type !== 'COMPONENT_SET') return

    const def = compSet.componentPropertyDefinitions.find((d) => d.name === propertyName)
    const defaultValue = def?.defaultValue ?? 'Default'

    ctx.undo.push({
      label: 'Delete variant value',
      forward: () => {
        for (const childId of compSet.childIds) {
          const child = ctx.graph.getNode(childId)
          if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
            if (child.componentPropertyValues[propertyName] === valueToDelete) {
              const nextValues = { ...child.componentPropertyValues, [propertyName]: defaultValue }
              ctx.graph.updateNode(childId, {
                componentPropertyValues: nextValues,
                name: buildVariantName(nextValues)
              })
            }
          }
        }
        ctx.requestRender()
      },
      inverse: () => {
        for (const childId of compSet.childIds) {
          const child = ctx.graph.getNode(childId)
          if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
            if (child.componentPropertyValues[propertyName] === defaultValue) {
              const prevValues = { ...child.componentPropertyValues, [propertyName]: valueToDelete }
              ctx.graph.updateNode(childId, {
                componentPropertyValues: prevValues,
                name: buildVariantName(prevValues)
              })
            }
          }
        }
        ctx.requestRender()
      }
    })

    for (const childId of compSet.childIds) {
      const child = ctx.graph.getNode(childId)
      if (child?.type === 'COMPONENT' && child.componentPropertyValues) {
        if (child.componentPropertyValues[propertyName] === valueToDelete) {
          const nextValues = { ...child.componentPropertyValues, [propertyName]: defaultValue }
          ctx.graph.updateNode(childId, {
            componentPropertyValues: nextValues,
            name: buildVariantName(nextValues)
          })
        }
      }
    }
    ctx.requestRender()
  }

  function insertComponentSetInstance(componentSetId: string): string | undefined {
    const compSet = ctx.graph.getNode(componentSetId)
    if (compSet?.type !== 'COMPONENT_SET') return undefined

    let defaultVariant = compSet.childIds
      .map((id) => ctx.graph.getNode(id))
      .find((n) => n?.type === 'COMPONENT' && n.componentPropertyValues?.State === 'Default')

    if (!defaultVariant) {
      const firstId = compSet.childIds[0]
      defaultVariant = firstId ? ctx.graph.getNode(firstId) : undefined
    }

    if (!defaultVariant) return undefined

    const pageId = compSet.parentId ?? ctx.state.currentPageId
    const x = compSet.x + compSet.width + 50
    const y = compSet.y

    const instance = ctx.graph.createInstance(defaultVariant.id, pageId, { x, y })
    if (!instance) return undefined

    const instanceId = instance.id
    ctx.setSelectedIds(new Set([instanceId]))

    ctx.undo.push({
      label: 'Insert instance',
      forward: () => {
        ctx.graph.createInstance(defaultVariant!.id, pageId, { ...instance })
        ctx.setSelectedIds(new Set([instanceId]))
      },
      inverse: () => {
        ctx.graph.deleteNode(instanceId)
        ctx.setSelectedIds(new Set([componentSetId]))
      }
    })
    ctx.requestRender()
    return instanceId
  }

  return {
    getComponentSetPropertyDefs,
    addPropertyDefinition,
    removePropertyDefinition,
    renamePropertyDefinition,
    parseVariantName,
    buildVariantName,
    collectVariantOptions,
    findVariantByValues,
    switchInstanceVariant,
    addVariantToComponentSet,
    addVariantToStandaloneComponent,
    renameVariantValue,
    deleteVariantValue,
    insertComponentSetInstance
  }
}
