import { BaseDirectory } from '@tauri-apps/api/path'
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  rename,
  writeFile,
  writeTextFile
} from '@tauri-apps/plugin-fs'

import type { ProjectRecord } from '@/app/dashboard/db'

import type { ProjectRepository } from './repository'

type ProjectMetadata = Omit<ProjectRecord, 'document' | 'thumbnail'>

const ROOT = 'projects'
const baseOptions = { baseDir: BaseDirectory.AppData } as const

function profileDirectory(profileId: string) {
  return `${ROOT}/${profileId}`
}

function projectDirectory(profileId: string, projectId: string) {
  return `${profileDirectory(profileId)}/${projectId}`
}

async function ensureDirectory(path: string) {
  await mkdir(path, { ...baseOptions, recursive: true })
}

async function atomicWrite(path: string, data: Uint8Array) {
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, data, baseOptions)
  await rename(temporaryPath, path, {
    oldPathBaseDir: BaseDirectory.AppData,
    newPathBaseDir: BaseDirectory.AppData
  })
}

async function atomicWriteText(path: string, value: string) {
  const temporaryPath = `${path}.tmp`
  await writeTextFile(temporaryPath, value, baseOptions)
  await rename(temporaryPath, path, {
    oldPathBaseDir: BaseDirectory.AppData,
    newPathBaseDir: BaseDirectory.AppData
  })
}

function metadataFromProject(project: ProjectRecord): ProjectMetadata {
  const { document: _document, thumbnail: _thumbnail, ...metadata } = project
  return metadata
}

function thumbnailBytes(dataUrl: string): Uint8Array | null {
  const encoded = dataUrl.split(',', 2)[1]
  if (!encoded) return null
  const binary = atob(encoded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function thumbnailDataUrl(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return `data:image/png;base64,${btoa(binary)}`
}

export function createTauriProjectRepository(profileId: string): ProjectRepository {
  async function get(id: string): Promise<ProjectRecord | undefined> {
    const directory = projectDirectory(profileId, id)
    try {
      const [metadataText, document, thumbnail] = await Promise.all([
        readTextFile(`${directory}/metadata.json`, baseOptions),
        readFile(`${directory}/document.fig`, baseOptions),
        exists(`${directory}/thumbnail.png`, baseOptions).then((present) =>
          present ? readFile(`${directory}/thumbnail.png`, baseOptions) : new Uint8Array()
        )
      ])
      const metadata = JSON.parse(metadataText) as ProjectMetadata
      return {
        ...metadata,
        profileId,
        document,
        thumbnail: thumbnail.length > 0 ? thumbnailDataUrl(thumbnail) : ''
      }
    } catch (error) {
      if (!(await exists(directory, baseOptions))) return undefined
      throw error
    }
  }

  async function create(project: ProjectRecord) {
    const normalized = { ...project, profileId }
    const directory = projectDirectory(profileId, project.id)
    await ensureDirectory(directory)
    await atomicWrite(`${directory}/document.fig`, normalized.document)
    const thumbnail = thumbnailBytes(normalized.thumbnail)
    if (thumbnail) await atomicWrite(`${directory}/thumbnail.png`, thumbnail)
    await atomicWriteText(
      `${directory}/metadata.json`,
      JSON.stringify(metadataFromProject(normalized), null, 2)
    )
  }

  async function update(id: string, changes: Partial<Omit<ProjectRecord, 'id'>>) {
    const current = await get(id)
    if (!current) throw new Error(`Project ${id} not found`)
    const updated = { ...current, ...changes, id, profileId }
    const directory = projectDirectory(profileId, id)
    if (changes.document) {
      const documentPath = `${directory}/document.fig`
      if (await exists(documentPath, baseOptions)) {
        const recoveryDirectory = `${directory}/recovery`
        await ensureDirectory(recoveryDirectory)
        await atomicWrite(
          `${recoveryDirectory}/latest.fig`,
          await readFile(documentPath, baseOptions)
        )
      }
      await atomicWrite(documentPath, changes.document)
    }
    if (changes.thumbnail) {
      const thumbnail = thumbnailBytes(changes.thumbnail)
      if (thumbnail) await atomicWrite(`${directory}/thumbnail.png`, thumbnail)
    }
    await atomicWriteText(
      `${directory}/metadata.json`,
      JSON.stringify(metadataFromProject(updated), null, 2)
    )
  }

  return {
    create,
    async delete(id) {
      await remove(projectDirectory(profileId, id), { ...baseOptions, recursive: true })
    },
    async duplicate(id) {
      const project = await get(id)
      if (!project) throw new Error(`Project ${id} not found`)
      const timestamp = Date.now()
      const duplicate = {
        ...project,
        id: crypto.randomUUID(),
        name: `${project.name} Copy`,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      await create(duplicate)
      return duplicate
    },
    get,
    async list() {
      const directory = profileDirectory(profileId)
      await ensureDirectory(directory)
      const entries = await readDir(directory, baseOptions)
      const projects = await Promise.all(
        entries.filter((entry) => entry.isDirectory).map((entry) => get(entry.name))
      )
      return projects.filter((project): project is ProjectRecord => project !== undefined)
    },
    update
  }
}
