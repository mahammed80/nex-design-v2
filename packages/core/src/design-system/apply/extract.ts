import { colorToHex, colorToHex8 } from '#core/color'
import { getDesignCollectionId } from '#core/design-system/storage'
import {
  parseTokenVariableName,
  tokenVariableName,
  type TokenRef
} from '#core/design-system/tokens'
import type { DesignSystemDoc, TypographyToken } from '#core/design-system/types'
import type { SceneGraph, Variable, VariableCollection, VariableValue } from '#core/scene-graph'

export type DesignTokens = Pick<DesignSystemDoc, 'colors' | 'typography' | 'rounded' | 'spacing'>

export function modeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

function colorText(value: VariableValue): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'r' in value) {
    return value.a < 1 ? colorToHex8(value) : colorToHex(value)
  }
  return null
}

/** Variables that hold design tokens: the dedicated collection if there is one, else all. */
export function designTokenVariables(graph: SceneGraph): Variable[] {
  const collectionId = getDesignCollectionId(graph)
  const variables = collectionId
    ? graph.getVariablesForCollection(collectionId)
    : [...graph.variables.values()]
  return variables.filter((variable) => parseTokenVariableName(variable.name, variable.type))
}

function valueIn(
  variable: Variable,
  collection: VariableCollection | undefined,
  modeId?: string
): VariableValue | undefined {
  const id = modeId ?? collection?.defaultModeId
  return (id ? variable.valuesByMode[id] : undefined) ?? Object.values(variable.valuesByMode)[0]
}

/** A color token: one value, or one per mode when the collection has several modes. */
function extractColor(
  variable: Variable,
  collection: VariableCollection | undefined,
  colorNameById: Map<string, string>
): DesignTokens['colors'][string] | null {
  const render = (value: VariableValue | undefined): string | null => {
    if (value === undefined) return null
    if (typeof value === 'object' && 'aliasId' in value) {
      const target = colorNameById.get(value.aliasId)
      return target ? `{colors.${target}}` : null
    }
    return colorText(value)
  }
  const modes = collection?.modes ?? []
  if (modes.length <= 1) return render(valueIn(variable, collection))
  const byMode: Record<string, string> = {}
  for (const mode of modes) {
    const text = render(valueIn(variable, collection, mode.modeId))
    if (text) byMode[modeKey(mode.name)] = text
  }
  return Object.keys(byMode).length > 0 ? byMode : null
}

function writeScalar(tokens: DesignTokens, ref: TokenRef, value: VariableValue | undefined) {
  if (ref.group === 'typography' && ref.prop) {
    const token: TypographyToken = (tokens.typography[ref.token] ??= {})
    if (ref.prop === 'fontFamily' || ref.prop === 'fontFeature') {
      if (typeof value === 'string') token[ref.prop] = value
    } else if (typeof value === 'number') {
      token[ref.prop] = value
    }
  } else if ((ref.group === 'rounded' || ref.group === 'spacing') && typeof value === 'number') {
    tokens[ref.group][ref.token] = value
  }
}

/** Read the document's variables back into DESIGN.md token sections. */
export function extractDesignTokens(graph: SceneGraph): DesignTokens {
  const tokens: DesignTokens = { colors: {}, typography: {}, rounded: {}, spacing: {} }
  const refs = designTokenVariables(graph).flatMap((variable) => {
    const ref = parseTokenVariableName(variable.name, variable.type)
    return ref ? [{ variable, ref }] : []
  })
  const colorNameById = new Map(
    refs
      .filter(({ ref }) => ref.group === 'colors')
      .map(({ variable, ref }) => [variable.id, ref.token])
  )

  for (const { variable, ref } of refs) {
    const collection = graph.variableCollections.get(variable.collectionId)
    if (ref.group === 'colors') {
      const color = extractColor(variable, collection, colorNameById)
      if (color) tokens.colors[ref.token] = color
    } else {
      writeScalar(tokens, ref, valueIn(variable, collection))
    }
  }
  return tokens
}

/** Canonical variable name for a token variable (legacy names map onto slash paths). */
export function canonicalTokenName(variable: Variable): string | null {
  const ref = parseTokenVariableName(variable.name, variable.type)
  return ref ? tokenVariableName(ref) : null
}
