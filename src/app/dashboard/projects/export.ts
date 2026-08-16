import type { ProjectRecord } from '@/app/dashboard/db'
import { downloadBlob } from '@/app/document/io/browser'
import { isTauri } from '@/app/tauri/env'

function projectFileName(name: string): string {
  const printableName = Array.from(name, (character) =>
    character.charCodeAt(0) < 32 ? '-' : character
  ).join('')
  const safeName = printableName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\.+$/g, '')
  return `${safeName || 'Untitled'}.fig`
}

async function chooseBrowserHandle(fileName: string): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: 'NexDesign / Figma file',
          accept: { 'application/octet-stream': ['.fig'] }
        }
      ]
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null
    throw error
  }
}

export async function exportDashboardProject(project: ProjectRecord): Promise<boolean> {
  const fileName = projectFileName(project.name)

  if (isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs')
    ])
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'NexDesign / Figma file', extensions: ['fig'] }]
    })
    if (!path) return false
    await writeFile(path, project.document)
    return true
  }

  const handle = await chooseBrowserHandle(fileName)
  if (handle) {
    const writable = await handle.createWritable()
    await writable.write(new Uint8Array(project.document))
    await writable.close()
    return true
  }

  if (window.showSaveFilePicker) return false
  downloadBlob(project.document, fileName, 'application/octet-stream')
  return true
}
