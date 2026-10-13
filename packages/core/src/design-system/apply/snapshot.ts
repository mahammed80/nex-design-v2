import type { SceneGraph, SceneNode, Variable, VariableCollection } from '#core/scene-graph'

/**
 * Everything applying a DESIGN.md can touch: collections, variables, active modes, the Style
 * Guide page's pluginData, and node bindings (removing a variable unbinds nodes). Variable data
 * is small, so a full clone keeps undo exact.
 */
export interface DesignStateSnapshot {
  collections: VariableCollection[]
  variables: Variable[]
  activeMode: Array<[string, string]>
  bindings: Array<[string, SceneNode['boundVariables']]>
  pagePluginData: Array<[string, SceneNode['pluginData']]>
}

export function snapshotDesignState(graph: SceneGraph): DesignStateSnapshot {
  const bindings: DesignStateSnapshot['bindings'] = []
  const pagePluginData: DesignStateSnapshot['pagePluginData'] = []
  for (const node of graph.nodes.values()) {
    if (Object.keys(node.boundVariables).length > 0) {
      bindings.push([node.id, structuredClone(node.boundVariables)])
    }
    if (node.type === 'CANVAS') pagePluginData.push([node.id, structuredClone(node.pluginData)])
  }
  return {
    collections: structuredClone([...graph.variableCollections.values()]),
    variables: structuredClone([...graph.variables.values()]),
    activeMode: [...graph.activeMode.entries()],
    bindings,
    pagePluginData
  }
}

export function restoreDesignState(graph: SceneGraph, snapshot: DesignStateSnapshot): void {
  graph.variableCollections.clear()
  for (const collection of structuredClone(snapshot.collections)) {
    graph.variableCollections.set(collection.id, collection)
  }
  graph.variables.clear()
  for (const variable of structuredClone(snapshot.variables))
    graph.variables.set(variable.id, variable)
  graph.activeMode.clear()
  for (const [collectionId, modeId] of snapshot.activeMode)
    graph.activeMode.set(collectionId, modeId)

  const bindings = new Map(snapshot.bindings)
  for (const node of graph.nodes.values()) {
    const saved = bindings.get(node.id)
    if (saved) node.boundVariables = structuredClone(saved)
    else if (Object.keys(node.boundVariables).length > 0) node.boundVariables = {}
  }
  for (const [pageId, pluginData] of snapshot.pagePluginData) {
    if (graph.getNode(pageId)) graph.updateNode(pageId, { pluginData: structuredClone(pluginData) })
  }
}
