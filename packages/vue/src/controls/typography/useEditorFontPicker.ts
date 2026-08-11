import { onUnmounted, computed } from 'vue'

import type { SceneNode } from '@nex-design/core/scene-graph'

import { useEditor } from '#vue/editor/context'
import { useSceneComputed } from '#vue/internal/scene-computed/use'

/**
 * Returns state actions to preview, restore, and apply fonts to selected text nodes.
 *
 * This hook encapsulates silent preview rendering on hover and clean undo history
 * for final selection applications.
 */
export function useEditorFontPicker() {
  const editor = useEditor()
  const originalFonts = new Map<string, string>()

  const selectedTextNode = useSceneComputed(() => {
    const ids = editor.state.selectedIds
    if (ids.size === 1) {
      const node = editor.graph.getNode([...ids][0])
      return node?.type === 'TEXT' ? node : null
    }
    return null
  })

  const stateText = computed(() => selectedTextNode.value?.fontFamily ?? '')
  let activePreviewFamily: string | null = null

  function invalidateRenderers() {
    editor.renderer?.invalidateAllPictures()
  }

  function getSelectedTextNodes(): SceneNode[] {
    const list: SceneNode[] = []
    for (const id of editor.state.selectedIds) {
      const node = editor.graph.getNode(id)
      if (node?.type === 'TEXT') {
        list.push(node)
      }
    }
    return list
  }

  async function previewFont(family: string) {
    activePreviewFamily = family
    const textNodes = getSelectedTextNodes()
    if (textNodes.length === 0) return

    await editor.loadFont(family, 'Regular')

    if (activePreviewFamily !== family) return

    for (const node of textNodes) {
      if (!originalFonts.has(node.id)) {
        originalFonts.set(node.id, node.fontFamily)
      }

      const nodeObj = editor.graph.getNode(node.id)
      if (nodeObj) {
        nodeObj.fontFamily = family
        if ('textPicture' in nodeObj) {
          nodeObj.textPicture = null
        }
        const te = editor.textEditor
        if (te && te.nodeId === node.id) {
          te.rebuildParagraph(nodeObj)
        }
      }
    }

    editor.state.fontPreviewActive = true
    invalidateRenderers()
    editor.requestRender()
  }

  function restoreFont() {
    activePreviewFamily = null
    if (originalFonts.size === 0) return

    for (const [id, originalFamily] of originalFonts) {
      const nodeObj = editor.graph.getNode(id)
      if (nodeObj) {
        nodeObj.fontFamily = originalFamily
        if ('textPicture' in nodeObj) {
          nodeObj.textPicture = null
        }
        const te = editor.textEditor
        if (te && te.nodeId === id) {
          te.rebuildParagraph(nodeObj)
        }
      }
    }

    originalFonts.clear()
    editor.state.fontPreviewActive = false
    invalidateRenderers()
    editor.requestRender()
  }

  async function applyFont(family: string) {
    activePreviewFamily = null
    const textNodes = getSelectedTextNodes()
    if (textNodes.length === 0) return

    editor.state.fontPreviewActive = false
    await editor.loadFont(family, 'Regular')

    for (const node of textNodes) {
      const originalFamily = originalFonts.get(node.id)
      const nodeObj = editor.graph.getNode(node.id)
      if (nodeObj && originalFamily !== undefined) {
        nodeObj.fontFamily = originalFamily
        if ('textPicture' in nodeObj) {
          nodeObj.textPicture = null
        }
      }
    }

    originalFonts.clear()
    invalidateRenderers()

    if (textNodes.length === 1) {
      editor.updateNodeWithUndo(textNodes[0].id, { fontFamily: family }, 'Change font')
    } else {
      const updates = textNodes.map((node) => {
        const prevFont = node.fontFamily
        return {
          id: node.id,
          forward: () => editor.updateNode(node.id, { fontFamily: family }),
          inverse: () => editor.updateNode(node.id, { fontFamily: prevFont })
        }
      })

      updates.forEach((u) => u.forward())

      editor.undo.push({
        label: 'Change fonts',
        forward: () => {
          updates.forEach((u) => u.forward())
          editor.requestRender()
        },
        inverse: () => {
          updates.forEach((u) => u.inverse())
          editor.requestRender()
        }
      })
      editor.requestRender()
    }
  }

  onUnmounted(() => {
    restoreFont()
  })

  return {
    stateText,
    previewFont,
    restoreFont,
    applyFont
  }
}
