import { setDesignCollectionId } from '#core/design-system/storage'
import { randomHex } from '#core/random'
import type { SceneGraph, VariableCollection, VariableValue } from '#core/scene-graph'

import { modeKey } from './extract'
import type { DesignApplyPlan, PlannedToken } from './plan'

function ensureCollection(graph: SceneGraph, plan: DesignApplyPlan): VariableCollection {
  const existing = plan.collectionId ? graph.variableCollections.get(plan.collectionId) : undefined
  const collection = existing ?? graph.createCollection(plan.collectionName)
  const [firstMode] = plan.modes
  if (
    firstMode &&
    collection.modes.length === 1 &&
    !plan.modes.includes(modeKey(collection.modes[0].name))
  ) {
    // A lone generic mode ("Mode 1") becomes the document's first mode (e.g. "light").
    collection.modes[0].name = firstMode
  }
  for (const key of plan.modes) {
    if (!collection.modes.some((mode) => modeKey(mode.name) === key)) {
      graph.addMode(collection.id, `mode:${randomHex(4)}`, key)
    }
  }
  return collection
}

function writeValues(
  graph: SceneGraph,
  collection: VariableCollection,
  token: PlannedToken,
  variableId: string,
  idByName: Map<string, string>
) {
  const variable = graph.variables.get(variableId)
  if (!variable) return
  const fallback = token.values['*'] ?? Object.values(token.values)[0]
  for (const mode of collection.modes) {
    const planned = token.values[modeKey(mode.name)] ?? fallback
    if (!planned) continue
    let value: VariableValue | undefined
    if ('aliasOf' in planned) {
      const aliasId = idByName.get(planned.aliasOf)
      value = aliasId && aliasId !== variableId ? { aliasId } : undefined
    } else {
      value = structuredClone(planned.value)
    }
    if (value !== undefined) variable.valuesByMode[mode.modeId] = value
  }
}

/**
 * Apply a plan to the graph and record the collection as the document's design system. Pure graph
 * mutation — callers wrap it with `snapshotDesignState` for undo.
 */
export function applyDesignPlan(graph: SceneGraph, plan: DesignApplyPlan): string {
  const collection = ensureCollection(graph, plan)

  for (const { variableId } of plan.remove) graph.removeVariable(variableId)

  const idByName = new Map<string, string>()
  for (const variable of graph.getVariablesForCollection(collection.id)) {
    idByName.set(variable.name, variable.id)
  }
  for (const token of plan.update) {
    const variable = graph.variables.get(token.variableId)
    if (!variable) continue
    if (token.renameFrom) idByName.delete(token.renameFrom)
    variable.name = token.name
    idByName.set(token.name, variable.id)
  }
  const created = plan.create.map((token) => {
    const variable = graph.createVariable(token.name, token.type, collection.id)
    idByName.set(token.name, variable.id)
    return { token, id: variable.id }
  })

  // Values last so aliases can point at tokens created in the same plan.
  for (const token of plan.update) writeValues(graph, collection, token, token.variableId, idByName)
  for (const { token, id } of created) writeValues(graph, collection, token, id, idByName)

  setDesignCollectionId(graph, collection.id)
  return collection.id
}
