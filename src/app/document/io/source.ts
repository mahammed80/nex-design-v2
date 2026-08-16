import type { Editor, EditorState } from '@nex-design/core/editor'
import { exportFigFile } from '@nex-design/core/io/formats/fig'

import { getActiveProfileId } from '@/app/dashboard/accounts/session'
import { uint8ArrayToBase64 } from '@/app/dashboard/db'
import { createProjectRepository } from '@/app/dashboard/projects/repository'
import { createAutosave } from '@/app/document/autosave'
import {
  documentNameFromFigPath,
  downloadNameFromPath,
  figDownloadName
} from '@/app/document/io/names'
import { createSaveActions } from '@/app/document/io/save'
import { createDocumentSourceState } from '@/app/document/io/source-state'

type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
  activeProjectId?: string | null
  projectSaveStatus: 'saved' | 'saving' | 'error'
}

type ExportableEditor = Editor & {
  renderExportImage: (ids: string[], scale: number, format: 'PNG') => Promise<Uint8Array | null>
}

export { createDocumentSourceState }

type DocumentSourceOptions = {
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  getFileHandle: () => FileSystemFileHandle | null
  setFileHandle: (handle: FileSystemFileHandle | null) => void
  getFilePath: () => string | null
  setFilePath: (path: string | null) => void
  getDownloadName: () => string | null
  setDownloadName: (name: string | null) => void
  getSavedVersion: () => number
  setSavedVersion: (version: number) => void
  setLastWriteTime: (time: number) => void
  getRenderer: () => Editor['renderer']
}

export function createDocumentSourceActions({
  editor,
  state,
  stopWatchingFile,
  startWatchingFile,
  getFileHandle,
  setFileHandle,
  getFilePath,
  setFilePath,
  getDownloadName,
  setDownloadName,
  getSavedVersion,
  setSavedVersion,
  setLastWriteTime,
  getRenderer
}: DocumentSourceOptions) {
  const activeProfileId = getActiveProfileId()
  const projectRepository = activeProfileId ? createProjectRepository(activeProfileId) : null

  function buildFigFile() {
    return exportFigFile(editor.graph, undefined, getRenderer() ?? undefined, state.currentPageId)
  }

  async function saveProjectToDb(projectId: string, data: Uint8Array) {
    let thumbnail = ''
    try {
      const renderer = editor.renderer
      if (renderer) {
        const ids = editor.graph.getChildren(state.currentPageId).map((n) => n.id)
        if (ids.length > 0) {
          const renderData = await (editor as ExportableEditor).renderExportImage([], 0.5, 'PNG')
          if (renderData) {
            thumbnail = uint8ArrayToBase64(renderData)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to generate thumbnail', e)
    }

    if (!projectRepository) throw new Error('Cannot save a project without an active local profile')
    await projectRepository.update(projectId, {
      document: data,
      thumbnail,
      updatedAt: Date.now()
    })
  }

  const { saveFigFile, saveFigFileAs, writeFile } = createSaveActions({
    state,
    buildFigFile,
    getFilePath,
    setFilePath,
    getFileHandle,
    setFileHandle,
    getDownloadName,
    setDownloadName,
    setSavedVersion,
    setLastWriteTime,
    startWatchingFile: () => {
      void startWatchingFile()
    },
    saveProjectToDb
  })

  const { disposeAutosave, flushAutosave } = createAutosave({
    state,
    getSavedVersion,
    setSavedVersion,
    hasWritableSource: () => !!getFileHandle() || !!getFilePath() || !!state.activeProjectId,
    saveCurrentDocument: async () => {
      if (state.activeProjectId) {
        await saveProjectToDb(state.activeProjectId, await buildFigFile())
      } else {
        await writeFile(await buildFigFile())
      }
    },
    onSaveStatus: (status) => {
      state.projectSaveStatus = status
    }
  })

  function setDocumentSource(
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) {
    stopWatchingFile()
    const isFig = sourceFormat === 'fig'
    setFileHandle(isFig ? (handle ?? null) : null)
    setFilePath(isFig ? (path ?? null) : null)
    setDownloadName(figDownloadName(fileName, sourceFormat))
    setSavedVersion(state.sceneVersion)
    if (isFig && (handle || path)) {
      void startWatchingFile()
    }
  }

  function setPlannedFilePath(path: string) {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(path)
    const downloadName = downloadNameFromPath(path)
    setDownloadName(downloadName)
    state.documentName = documentNameFromFigPath(downloadName)
  }

  function startWatchingCurrentFile() {
    void startWatchingFile()
  }

  function disposeDocumentIO() {
    stopWatchingFile()
    disposeAutosave()
    void flushAutosave()
  }

  return {
    setDocumentSource,
    setPlannedFilePath,
    startWatchingCurrentFile,
    disposeDocumentIO,
    saveFigFile,
    saveFigFileAs
  }
}
