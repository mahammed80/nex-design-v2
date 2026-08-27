import { computed } from 'vue'

import type { EditorCommandMapOptions } from './context'
import type { EditorCommand, EditorCommandId } from './types'

type SelectionCommandId = Extract<EditorCommandId, `selection.${string}`>

export function createSelectionCommands({
  editor,
  selection,
  capabilities,
  messages: t,
  otherPages,
  moveSelectionToPage
}: EditorCommandMapOptions): Record<SelectionCommandId, EditorCommand> {
  return {
    'selection.selectAll': {
      id: 'selection.selectAll',
      get label() {
        return t.value.selectAll
      },
      enabled: capabilities.canSelectAll,
      run: () => editor.selectAll()
    },
    'selection.duplicate': {
      id: 'selection.duplicate',
      get label() {
        return t.value.duplicate
      },
      enabled: capabilities.canDuplicate,
      run: () => editor.duplicateSelected()
    },
    'selection.delete': {
      id: 'selection.delete',
      get label() {
        return t.value.delete
      },
      enabled: capabilities.canDelete,
      run: () => editor.deleteSelected()
    },
    'selection.copyProperties': {
      id: 'selection.copyProperties',
      get label() {
        return t.value.copyProperties
      },
      enabled: capabilities.canCopyProperties,
      run: () => editor.copyProperties()
    },
    'selection.pasteProperties': {
      id: 'selection.pasteProperties',
      get label() {
        return t.value.pasteProperties
      },
      enabled: capabilities.canPasteProperties,
      run: () => editor.pasteProperties()
    },
    'selection.group': {
      id: 'selection.group',
      get label() {
        return t.value.group
      },
      enabled: capabilities.canGroup,
      run: () => editor.groupSelected()
    },
    'selection.ungroup': {
      id: 'selection.ungroup',
      get label() {
        return t.value.ungroup
      },
      enabled: capabilities.canUngroup,
      run: () => editor.ungroupSelected()
    },
    'selection.createComponent': {
      id: 'selection.createComponent',
      get label() {
        return t.value.createComponent
      },
      enabled: capabilities.canCreateComponent,
      run: () => editor.createComponentFromSelection()
    },
    'selection.createComponentSet': {
      id: 'selection.createComponentSet',
      get label() {
        return t.value.createComponentSet
      },
      enabled: capabilities.canCreateComponentSet,
      run: () => editor.createComponentSetFromComponents()
    },
    'selection.createInstance': {
      id: 'selection.createInstance',
      get label() {
        return t.value.createInstance
      },
      enabled: capabilities.canCreateInstance,
      run: () => {
        const node = selection.selectedNode.value
        if (node?.type === 'COMPONENT') editor.createInstanceFromComponent(node.id)
      }
    },
    'selection.detachInstance': {
      id: 'selection.detachInstance',
      get label() {
        return t.value.detachInstance
      },
      enabled: capabilities.canDetachInstance,
      run: () => editor.detachInstance()
    },
    'selection.goToMainComponent': {
      id: 'selection.goToMainComponent',
      get label() {
        return t.value.goToMainComponent
      },
      enabled: capabilities.canGoToMainComponent,
      run: () => editor.goToMainComponent()
    },
    'selection.wrapInAutoLayout': {
      id: 'selection.wrapInAutoLayout',
      get label() {
        return t.value.addAutoLayout
      },
      enabled: capabilities.canWrapInAutoLayout,
      run: () => editor.wrapInAutoLayout()
    },
    'selection.bringToFront': {
      id: 'selection.bringToFront',
      get label() {
        return t.value.bringToFront
      },
      enabled: capabilities.canBringToFront,
      run: () => editor.bringToFront()
    },
    'selection.sendToBack': {
      id: 'selection.sendToBack',
      get label() {
        return t.value.sendToBack
      },
      enabled: capabilities.canSendToBack,
      run: () => editor.sendToBack()
    },
    'selection.toggleVisibility': {
      id: 'selection.toggleVisibility',
      get label() {
        return t.value.toggleVisibility
      },
      enabled: capabilities.canToggleVisibility,
      run: () => editor.toggleVisibility()
    },
    'selection.toggleLock': {
      id: 'selection.toggleLock',
      get label() {
        return t.value.toggleLock
      },
      enabled: capabilities.canToggleLock,
      run: () => editor.toggleLock()
    },
    'selection.toggleMask': {
      id: 'selection.toggleMask',
      get label() {
        return t.value.toggleMask
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) > 0),
      run: () => editor.toggleMaskSelected()
    },
    'selection.moveToPage': {
      id: 'selection.moveToPage',
      get label() {
        return t.value.moveToPage
      },
      enabled: capabilities.canMoveToPage,
      run: () => {
        moveSelectionToPage(otherPages.value[0].id)
      }
    },
    'selection.tidyUp': {
      id: 'selection.tidyUp',
      get label() {
        return t.value.tidyUp
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) >= 2),
      run: () => editor.tidyUp()
    },
    'selection.distributeHorizontal': {
      id: 'selection.distributeHorizontal',
      get label() {
        return t.value.distributeHorizontal
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) >= 3),
      run: () => editor.distributeSpacing('HORIZONTAL')
    },
    'selection.distributeVertical': {
      id: 'selection.distributeVertical',
      get label() {
        return t.value.distributeVertical
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) >= 3),
      run: () => editor.distributeSpacing('VERTICAL')
    },
    'selection.flipHorizontal': {
      id: 'selection.flipHorizontal',
      get label() {
        return t.value.flipHorizontal
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) > 0),
      run: () => editor.flipHorizontalSelected()
    },
    'selection.flipVertical': {
      id: 'selection.flipVertical',
      get label() {
        return t.value.flipVertical
      },
      enabled: computed(() => (editor.state.selectedIds.size ?? 0) > 0),
      run: () => editor.flipVerticalSelected()
    }
  }
}
