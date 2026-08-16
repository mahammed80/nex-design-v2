import { watchDebounced } from '@vueuse/core'

import type { EditorState } from '@nex-design/core/editor'

type AutosaveState = EditorState & { autosaveEnabled: boolean }

type AutosaveOptions = {
  state: AutosaveState
  getSavedVersion: () => number
  setSavedVersion: (version: number) => void
  hasWritableSource: () => boolean
  saveCurrentDocument: () => Promise<void>
  onSaveStatus?: (status: 'saved' | 'saving' | 'error') => void
}

export function createAutosave({
  state,
  getSavedVersion,
  setSavedVersion,
  hasWritableSource,
  saveCurrentDocument,
  onSaveStatus
}: AutosaveOptions) {
  let saveQueue = Promise.resolve()
  let queuedVersion = getSavedVersion()
  function enqueueSave() {
    const version = state.sceneVersion
    queuedVersion = version
    onSaveStatus?.('saving')
    saveQueue = saveQueue
      .then(saveCurrentDocument)
      .then(() => {
        setSavedVersion(version)
        onSaveStatus?.('saved')
      })
      .catch((error: unknown) => {
        onSaveStatus?.('error')
        console.warn('Autosave failed:', error)
      })
    return saveQueue
  }

  const stop = watchDebounced(
    () => state.sceneVersion,
    async (version) => {
      if (version === getSavedVersion()) return
      if (!state.autosaveEnabled) return
      if (!hasWritableSource()) return
      await enqueueSave()
    },
    { debounce: 3000 }
  )

  return {
    disposeAutosave: stop,
    flushAutosave: () => {
      if (!state.autosaveEnabled || !hasWritableSource()) return saveQueue
      if (state.sceneVersion === getSavedVersion() || state.sceneVersion === queuedVersion) {
        return saveQueue
      }
      return enqueueSave()
    }
  }
}
