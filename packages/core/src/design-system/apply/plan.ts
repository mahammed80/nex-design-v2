import { parseColor } from '#core/color'
import { getDesignCollectionId } from '#core/design-system/storage'
import {
  DESIGN_SYSTEM_COLLECTION_NAME,
  parseTokenVariableName,
  TYPOGRAPHY_PROPS,
  tokenVariableName,
  tokenVariableType,
  type TokenRef,
  type TypographyProp
} from '#core/design-system/tokens'
import type { DesignSystemDoc } from '#core/design-system/types'
import type {
  SceneGraph,
  Variable,
  VariableCollection,
  VariableType,
  VariableValue
} from '#core/scene-graph'

import { modeKey } from './extract'

/** A planned value: a literal, or an alias to another token variable (by canonical name). */
export type PlannedValue = { value: VariableValue } | { aliasOf: string }

export interface PlannedToken {
  name: string
  type: VariableType
  /** Keyed by mode key (`light`, `dark`, …); `*` means every mode. */
  values: Record<string, PlannedValue>
}

export interface DesignApplyPlan {
  /** Existing collection to write into, or null to create `collectionName`. */
  collectionId: string | null
  collectionName: string
  /** Mode keys the document needs (from per-mode colors). Empty = keep the collection's modes. */
  modes: string[]
  create: PlannedToken[]
  update: Array<PlannedToken & { variableId: string; renameFrom?: string }>
  remove: Array<{ variableId: string; name: string }>
  conflicts: Array<{ name: string; existingType: VariableType; wantedType: VariableType }>
  unchanged: number
}

const TOKEN_REF = /^\{(colors)\.([^}]+)\}$/

function plannedColor(text: string): PlannedValue {
  const ref = text.match(TOKEN_REF)
  if (ref) return { aliasOf: tokenVariableName({ group: 'colors', token: ref[2] }) }
  return { value: parseColor(text) }
}

function desiredTokens(doc: DesignSystemDoc): PlannedToken[] {
  const tokens: PlannedToken[] = []
  const push = (ref: TokenRef, values: PlannedToken['values']) =>
    tokens.push({ name: tokenVariableName(ref), type: tokenVariableType(ref), values })

  for (const [token, value] of Object.entries(doc.colors)) {
    if (typeof value === 'string') push({ group: 'colors', token }, { '*': plannedColor(value) })
    else {
      const values: PlannedToken['values'] = {}
      for (const [mode, text] of Object.entries(value)) values[modeKey(mode)] = plannedColor(text)
      push({ group: 'colors', token }, values)
    }
  }
  for (const [token, typography] of Object.entries(doc.typography)) {
    for (const prop of Object.keys(TYPOGRAPHY_PROPS) as TypographyProp[]) {
      const value = typography[prop]
      if (value !== undefined) push({ group: 'typography', token, prop }, { '*': { value } })
    }
  }
  for (const group of ['rounded', 'spacing'] as const) {
    for (const [token, value] of Object.entries(doc[group]))
      push({ group, token }, { '*': { value } })
  }
  return tokens
}

/**
 * Pick the collection to apply into. Only a collection that is unambiguously the design system
 * (the stored id, or one named "Design System") may have tokens deleted; when adopting a generic
 * first collection, tokens missing from DESIGN.md are left alone.
 */
function targetCollection(graph: SceneGraph): { collection?: VariableCollection; owned: boolean } {
  const storedId = getDesignCollectionId(graph)
  if (storedId) return { collection: graph.variableCollections.get(storedId), owned: true }
  const collections = [...graph.variableCollections.values()]
  const named = collections.find((c) => c.name === DESIGN_SYSTEM_COLLECTION_NAME)
  if (named) return { collection: named, owned: true }
  return { collection: collections[0], owned: false }
}

function sameValues(
  variable: Variable,
  collection: VariableCollection,
  planned: PlannedToken,
  graph: SceneGraph
) {
  for (const mode of collection.modes) {
    const want =
      planned.values[modeKey(mode.name)] ?? planned.values['*'] ?? Object.values(planned.values)[0]
    const have = variable.valuesByMode[mode.modeId]
    if (!want || have === undefined) return false
    if ('aliasOf' in want) {
      if (typeof have !== 'object' || !('aliasId' in have)) return false
      if (graph.variables.get(have.aliasId)?.name !== want.aliasOf) return false
    } else if (JSON.stringify(have) !== JSON.stringify(want.value)) {
      return false
    }
  }
  return true
}

export function planDesignApply(graph: SceneGraph, doc: DesignSystemDoc): DesignApplyPlan {
  const { collection, owned } = targetCollection(graph)
  const desired = desiredTokens(doc)
  const modes = [
    ...new Set(desired.flatMap((token) => Object.keys(token.values).filter((key) => key !== '*')))
  ]
  const plan: DesignApplyPlan = {
    collectionId: collection?.id ?? null,
    collectionName: collection?.name ?? DESIGN_SYSTEM_COLLECTION_NAME,
    modes,
    create: [],
    update: [],
    remove: [],
    conflicts: [],
    unchanged: 0
  }

  // Index existing token variables by canonical name so legacy names update in place.
  const existing = new Map<string, Variable>()
  for (const variable of collection ? graph.getVariablesForCollection(collection.id) : []) {
    const ref = parseTokenVariableName(variable.name, variable.type)
    if (ref) existing.set(tokenVariableName(ref), variable)
    else if (!existing.has(variable.name)) existing.set(variable.name, variable)
  }

  const seen = new Set<string>()
  for (const token of desired) {
    seen.add(token.name)
    const variable = existing.get(token.name)
    if (!variable) plan.create.push(token)
    else if (variable.type !== token.type) {
      plan.conflicts.push({ name: token.name, existingType: variable.type, wantedType: token.type })
    } else if (
      collection &&
      variable.name === token.name &&
      sameValues(variable, collection, token, graph)
    ) {
      plan.unchanged++
    } else {
      plan.update.push({
        ...token,
        variableId: variable.id,
        renameFrom: variable.name !== token.name ? variable.name : undefined
      })
    }
  }

  if (owned) {
    for (const [name, variable] of existing) {
      if (!seen.has(name) && parseTokenVariableName(variable.name, variable.type)) {
        plan.remove.push({ variableId: variable.id, name: variable.name })
      }
    }
  }
  return plan
}

export function planIsEmpty(plan: DesignApplyPlan): boolean {
  return plan.create.length + plan.update.length + plan.remove.length === 0
}
