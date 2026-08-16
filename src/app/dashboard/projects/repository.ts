import { readLinkedAccountSession } from '@/app/dashboard/accounts/access'
import {
  createProjectInDb,
  deleteProjectInDb,
  duplicateProjectInDb,
  getAllProjectsFromDb,
  getProjectFromDb,
  openDb,
  updateProjectInDb,
  type ProjectRecord
} from '@/app/dashboard/db'
import { enqueueProjectSync } from '@/app/dashboard/sync/outbox'
import { IS_TAURI } from '@/constants'

import { createTauriProjectRepository } from './tauri-repository'

export interface ProjectRepository {
  create(project: ProjectRecord): Promise<void>
  delete(id: string): Promise<void>
  duplicate(id: string): Promise<ProjectRecord>
  get(id: string): Promise<ProjectRecord | undefined>
  list(): Promise<ProjectRecord[]>
  update(id: string, changes: Partial<Omit<ProjectRecord, 'id'>>): Promise<void>
}

export function createIndexedDbProjectRepository(profileId: string): ProjectRepository {
  let database: Promise<IDBDatabase> | undefined
  const getDatabase = () => (database ??= openDb())

  return {
    async create(project) {
      await createProjectInDb(await getDatabase(), { ...project, profileId })
    },
    async delete(id) {
      await deleteProjectInDb(await getDatabase(), id)
    },
    async duplicate(id) {
      return duplicateProjectInDb(await getDatabase(), id)
    },
    async get(id) {
      const project = await getProjectFromDb(await getDatabase(), id)
      return project?.profileId === profileId || !project?.profileId ? project : undefined
    },
    async list() {
      const db = await getDatabase()
      const projects = await getAllProjectsFromDb(db)
      const legacyProjects = projects.filter((project) => !project.profileId)
      await Promise.all(
        legacyProjects.map((project) => updateProjectInDb(db, project.id, { profileId }))
      )
      return projects
        .filter((project) => project.profileId === profileId || !project.profileId)
        .map((project) => ({ ...project, profileId }))
    },
    async update(id, changes) {
      await updateProjectInDb(await getDatabase(), id, changes)
    }
  }
}

export function createProjectRepository(profileId: string): ProjectRepository {
  const localRepository = IS_TAURI
    ? createMigratingDesktopRepository(profileId)
    : createIndexedDbProjectRepository(profileId)
  const linkedAccount = readLinkedAccountSession()
  if (!linkedAccount) return localRepository

  return {
    async create(project) {
      const syncedProject = { ...project, localRevision: 1, syncStatus: 'pending' as const }
      await localRepository.create(syncedProject)
      await enqueueProjectSync(linkedAccount.accountId, syncedProject, 'create')
    },
    async delete(id) {
      const project = await localRepository.get(id)
      await localRepository.delete(id)
      if (project) await enqueueProjectSync(linkedAccount.accountId, project, 'delete')
    },
    async duplicate(id) {
      const project = await localRepository.duplicate(id)
      const syncedProject = { ...project, localRevision: 1, syncStatus: 'pending' as const }
      await localRepository.update(project.id, syncedProject)
      await enqueueProjectSync(linkedAccount.accountId, syncedProject, 'create')
      return syncedProject
    },
    get: localRepository.get,
    list: localRepository.list,
    async update(id, changes) {
      const current = await localRepository.get(id)
      if (!current) throw new Error(`Project ${id} not found`)
      const project = {
        ...current,
        ...changes,
        localRevision: (current.localRevision ?? 0) + 1,
        syncStatus: 'pending' as const
      }
      await localRepository.update(id, project)
      await enqueueProjectSync(linkedAccount.accountId, project, 'update')
    }
  }
}

function createMigratingDesktopRepository(profileId: string): ProjectRepository {
  const desktop = createTauriProjectRepository(profileId)
  const browser = createIndexedDbProjectRepository(profileId)
  let migration: Promise<void> | undefined
  const ensureMigration = () =>
    (migration ??= (async () => {
      const desktopProjects = await desktop.list()
      if (desktopProjects.length > 0) return
      const legacyProjects = await browser.list()
      await Promise.all(legacyProjects.map((project) => desktop.create(project)))
    })())

  return {
    async create(project) {
      await ensureMigration()
      await desktop.create(project)
    },
    async delete(id) {
      await ensureMigration()
      await desktop.delete(id)
    },
    async duplicate(id) {
      await ensureMigration()
      return desktop.duplicate(id)
    },
    async get(id) {
      await ensureMigration()
      return desktop.get(id)
    },
    async list() {
      await ensureMigration()
      return desktop.list()
    },
    async update(id, changes) {
      await ensureMigration()
      await desktop.update(id, changes)
    }
  }
}
