import { SceneGraph } from '@nex-design/core/scene-graph'
import type { SceneNode, Variable, VariableValue } from '@nex-design/core/scene-graph'

/**
 * A SceneGraph view over the player's session nodes (variant swaps, tweened smart-animate
 * frames) that the CanvasKit renderer can draw. Images, collections, and modes are shared with
 * the document read-only; variables are copied only where the session overrides a value, and
 * the override is written into each collection's active mode so bound fills pick it up.
 */
export function buildSessionGraph(
  source: SceneGraph,
  nodes: Map<string, SceneNode>,
  variableValues: ReadonlyMap<string, VariableValue>
): SceneGraph {
  const graph = new SceneGraph()
  graph.nodes = nodes
  graph.rootId = source.rootId
  graph.images = source.images
  graph.variableCollections = source.variableCollections
  graph.activeMode = source.activeMode
  graph.documentColorSpace = source.documentColorSpace

  if (variableValues.size === 0) {
    graph.variables = source.variables
    return graph
  }
  const variables = new Map<string, Variable>(source.variables)
  for (const [id, value] of variableValues) {
    const variable = source.variables.get(id)
    if (!variable) continue
    const collection = source.variableCollections.get(variable.collectionId)
    const modeId = source.activeMode.get(variable.collectionId) ?? collection?.defaultModeId
    if (!modeId) continue
    variables.set(id, {
      ...variable,
      valuesByMode: { ...variable.valuesByMode, [modeId]: structuredClone(value) }
    })
  }
  graph.variables = variables
  return graph
}
