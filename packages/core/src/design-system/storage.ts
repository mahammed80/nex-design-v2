import { NEX_DESIGN_PLUGIN_ID } from '#core/kiwi/node-change/plugin-data'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

/**
 * Design-system state lives in nex-design pluginData on the Style Guide page, so it travels with
 * the page through `.fig` save/open and collaboration: the page marker (pages are found by marker,
 * not by their editable name), the DESIGN.md source, and the id of the tokens collection.
 */

export const STYLE_GUIDE_PAGE_NAME = 'Style Guide'
const MARKER_KEY = 'styleGuide'
const DESIGN_MD_KEY = 'designMd'
/** Holds a variable-collection id, so `.fig` export must remap it (ids change on export). */
export const DESIGN_COLLECTION_PLUGIN_KEY = 'designSystemCollectionId'
const COLLECTION_KEY = DESIGN_COLLECTION_PLUGIN_KEY
const COLLECTION_NAME = 'Design System'

function readKey(node: SceneNode, key: string): string | null {
  return (
    node.pluginData.find((entry) => entry.pluginId === NEX_DESIGN_PLUGIN_ID && entry.key === key)
      ?.value ?? null
  )
}

function writeKey(graph: SceneGraph, node: SceneNode, key: string, value: string | null): void {
  const pluginData = node.pluginData.filter(
    (entry) => !(entry.pluginId === NEX_DESIGN_PLUGIN_ID && entry.key === key)
  )
  if (value !== null) pluginData.push({ pluginId: NEX_DESIGN_PLUGIN_ID, key, value })
  graph.updateNode(node.id, { pluginData })
}

export function isStyleGuidePage(node: SceneNode | undefined): boolean {
  return node?.type === 'CANVAS' && readKey(node, MARKER_KEY) === '1'
}

/** The Style Guide page by marker, falling back to the legacy name match for older files. */
export function findStyleGuidePage(graph: SceneGraph): SceneNode | undefined {
  const pages = graph.getPages()
  return (
    pages.find((page) => isStyleGuidePage(page)) ??
    pages.find((page) => page.name === STYLE_GUIDE_PAGE_NAME)
  )
}

/** Find (migrating a name-matched page to the marker) or create the Style Guide page. */
export function ensureStyleGuidePage(graph: SceneGraph): SceneNode {
  const page = findStyleGuidePage(graph) ?? graph.addPage(STYLE_GUIDE_PAGE_NAME)
  if (!isStyleGuidePage(page)) writeKey(graph, page, MARKER_KEY, '1')
  return page
}

export function getStoredDesignMd(graph: SceneGraph): string | null {
  const page = findStyleGuidePage(graph)
  return page ? readKey(page, DESIGN_MD_KEY) : null
}

export function setStoredDesignMd(graph: SceneGraph, markdown: string | null): void {
  writeKey(graph, ensureStyleGuidePage(graph), DESIGN_MD_KEY, markdown)
}

export function getDesignCollectionId(graph: SceneGraph): string | null {
  const page = findStyleGuidePage(graph)
  const id = page ? readKey(page, COLLECTION_KEY) : null
  if (id && graph.variableCollections.has(id)) return id
  // Files from other tools (or saved before the id was remapped) only have the name.
  if (!page) return null
  for (const collection of graph.variableCollections.values()) {
    if (collection.name === COLLECTION_NAME) return collection.id
  }
  return null
}

export function setDesignCollectionId(graph: SceneGraph, collectionId: string | null): void {
  writeKey(graph, ensureStyleGuidePage(graph), COLLECTION_KEY, collectionId)
}
