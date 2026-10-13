import { computed } from 'vue'

import { colorToHex, parseColor } from '@nex-design/core/color'
import type { SceneNode, Variable, VariableValue } from '@nex-design/core/scene-graph'
import type { Color } from '@nex-design/core/types'

import { useEditorStore } from '@/app/editor/active-store'

export interface TargetOption {
  value: string
  label: string
}

const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'SECTION'])

function isColor(value: unknown): value is Color {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'g' in value &&
    'b' in value &&
    'a' in value
  )
}

/** Destination, variant, scroll-target, and variable choices for the prototype panel. */
export function usePrototypeTargets() {
  const editor = useEditorStore()

  const topLevelFrames = computed<TargetOption[]>(() => {
    void editor.state.sceneVersion
    return editor.graph
      .getChildren(editor.state.currentPageId)
      .filter((node) => FRAME_TYPES.has(node.type))
      .map((node) => ({ value: node.id, label: node.name || node.type }))
  })

  function frameOptions(excludeId?: string): TargetOption[] {
    return topLevelFrames.value.filter((option) => option.value !== excludeId)
  }

  const layerOptions = computed<TargetOption[]>(() => {
    void editor.state.sceneVersion
    const result: TargetOption[] = []
    const visit = (nodeId: string, depth: number) => {
      const node = editor.graph.getNode(nodeId)
      if (!node || node.type === 'CANVAS') return
      result.push({
        value: node.id,
        label: `${'  '.repeat(depth)}${node.name || node.type} (${node.type})`
      })
      for (const childId of node.childIds) visit(childId, depth + 1)
    }
    for (const childId of editor.graph.getNode(editor.state.currentPageId)?.childIds ?? []) {
      visit(childId, 0)
    }
    return result
  })

  function sourceComponent(source: SceneNode): SceneNode | undefined {
    if (source.type === 'COMPONENT') return source
    if (source.type === 'INSTANCE' && source.componentId) {
      return editor.graph.getNode(source.componentId)
    }
    return undefined
  }

  function variantOptions(source: SceneNode): TargetOption[] {
    const component = sourceComponent(source)
    const set = component?.parentId ? editor.graph.getNode(component.parentId) : undefined
    if (set?.type !== 'COMPONENT_SET') return []
    return set.childIds
      .map((id) => editor.graph.getNode(id))
      .filter((node): node is SceneNode => node?.type === 'COMPONENT')
      .map((node) => ({
        value: node.id,
        label:
          node.name ||
          Object.entries(node.componentPropertyValues)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ') ||
          node.id
      }))
  }

  const variableOptions = computed<TargetOption[]>(() => {
    void editor.state.sceneVersion
    return [...editor.graph.variables.values()].map((variable) => {
      const collection = editor.graph.variableCollections.get(variable.collectionId)
      return {
        value: variable.id,
        label: collection ? `${collection.name} / ${variable.name}` : variable.name
      }
    })
  })

  function getVariable(id: string | undefined): Variable | undefined {
    return id ? editor.graph.variables.get(id) : undefined
  }

  function variableDefaultValue(variable: Variable): VariableValue {
    const collection = editor.graph.variableCollections.get(variable.collectionId)
    const modeId = editor.graph.activeMode.get(variable.collectionId) ?? collection?.defaultModeId
    const value = modeId ? variable.valuesByMode[modeId] : undefined
    if (value !== undefined) return structuredClone(value)
    if (variable.type === 'BOOLEAN') return false
    if (variable.type === 'FLOAT') return 0
    if (variable.type === 'COLOR') return parseColor('#000000')
    return ''
  }

  function displayVariableValue(variable: Variable | undefined, value: unknown): string | number {
    if (!variable) return ''
    if (variable.type === 'COLOR' && isColor(value)) return colorToHex(value)
    if (variable.type === 'FLOAT' && typeof value === 'number') return value
    return typeof value === 'string' ? value : ''
  }

  return {
    frameOptions,
    layerOptions,
    variantOptions,
    variableOptions,
    getVariable,
    variableDefaultValue,
    displayVariableValue
  }
}
