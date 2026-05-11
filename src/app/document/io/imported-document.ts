import type { Editor } from '@nex-design/core/editor'
import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'

export async function applyImportedDocument(editor: Editor, imported: SceneGraph) {
  editor.replaceGraph(imported)
  editor.undo.clear()
  editor.clearSelection()
  const firstPage = editor.graph.getPages()[0] as SceneNode | undefined
  const pageId = firstPage?.id ?? editor.graph.rootId
  await editor.switchPage(pageId)
}
