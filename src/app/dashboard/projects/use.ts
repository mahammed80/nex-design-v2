import { computed, ref, type Ref } from 'vue'

import { exportFigFile } from '@nex-design/core/io/formats/fig'

import { getActiveProfileId } from '@/app/dashboard/accounts/session'
import { uint8ArrayToBase64, type ProjectRecord } from '@/app/dashboard/db'
import { createDemoShapes } from '@/app/demo/document'
import { createEditorStore } from '@/app/editor/session'

import { createProjectRepository, type ProjectRepository } from './repository'

export type DashboardView = 'home' | 'recents' | 'starred' | 'projects'
export type ProjectSort = 'modified' | 'created' | 'name'

interface DashboardProjectOptions {
  activeView: Ref<DashboardView>
  repository?: ProjectRepository
  searchQuery: Ref<string>
  sortBy: Ref<ProjectSort>
}

async function createDemoProject(profileId: string): Promise<ProjectRecord> {
  const store = createEditorStore()
  try {
    createDemoShapes(store)
    const document = await exportFigFile(store.graph)
    let thumbnail = ''
    try {
      const renderData = await store.renderExportImage([], 0.5, 'PNG')
      if (renderData) thumbnail = uint8ArrayToBase64(renderData)
    } catch (error) {
      console.warn('Failed to render demo thumbnail', error)
    }
    const timestamp = Date.now() - 2 * 60 * 60 * 1000
    return {
      id: 'demo-project-id',
      profileId,
      name: 'SaaS Dashboard (Demo)',
      document,
      thumbnail,
      starred: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  } finally {
    store.dispose()
  }
}

export function useDashboardProjects(options: DashboardProjectOptions) {
  const activeProfileId = getActiveProfileId()
  if (!activeProfileId) throw new Error('An active local profile is required')
  const profileId: string = activeProfileId
  const repository = options.repository ?? createProjectRepository(profileId)
  const projects = ref<ProjectRecord[]>([])
  const loading = ref(true)

  const filteredProjects = computed(() => {
    let list = [...projects.value]
    if (options.activeView.value === 'starred') list = list.filter((project) => project.starred)
    else if (options.activeView.value === 'recents') list.sort((a, b) => b.updatedAt - a.updatedAt)

    const query = options.searchQuery.value.trim().toLowerCase()
    if (query) list = list.filter((project) => project.name.toLowerCase().includes(query))

    if (options.activeView.value !== 'recents') {
      list.sort((a, b) => {
        if (options.sortBy.value === 'modified') return b.updatedAt - a.updatedAt
        if (options.sortBy.value === 'created') return b.createdAt - a.createdAt
        return a.name.localeCompare(b.name)
      })
    }
    return list
  })

  const groupedRecents = computed(() => {
    const groups = {
      today: [] as ProjectRecord[],
      yesterday: [] as ProjectRecord[],
      earlier: [] as ProjectRecord[]
    }
    const now = Date.now()
    for (const project of [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)) {
      const age = now - project.updatedAt
      if (age < 24 * 60 * 60 * 1000) groups.today.push(project)
      else if (age < 48 * 60 * 60 * 1000) groups.yesterday.push(project)
      else groups.earlier.push(project)
    }
    return groups
  })

  const starredProjects = computed(() => projects.value.filter((project) => project.starred))

  async function loadProjects() {
    loading.value = true
    try {
      let list = await repository.list()
      if (list.length === 0) {
        await repository.create(await createDemoProject(profileId))
        list = await repository.list()
      }
      projects.value = list
    } finally {
      loading.value = false
    }
  }

  async function createBlankProject(): Promise<ProjectRecord> {
    const store = createEditorStore()
    try {
      store.graph.addPage('Page 1')
      const timestamp = Date.now()
      const project: ProjectRecord = {
        id: crypto.randomUUID(),
        profileId,
        name: 'Untitled',
        thumbnail: '',
        starred: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        document: await exportFigFile(store.graph)
      }
      await repository.create(project)
      return project
    } finally {
      store.dispose()
    }
  }

  async function addProject(project: ProjectRecord) {
    await repository.create(project)
  }

  async function toggleStar(project: ProjectRecord) {
    await repository.update(project.id, { starred: !project.starred })
    await loadProjects()
  }

  async function renameProject(project: ProjectRecord, name: string) {
    await repository.update(project.id, { name: name.trim(), updatedAt: Date.now() })
    await loadProjects()
  }

  async function duplicateProject(project: ProjectRecord) {
    await repository.duplicate(project.id)
    await loadProjects()
  }

  async function deleteProject(project: ProjectRecord) {
    await repository.delete(project.id)
    await loadProjects()
  }

  return {
    addProject,
    createBlankProject,
    deleteProject,
    duplicateProject,
    filteredProjects,
    groupedRecents,
    loadProjects,
    loading,
    projects,
    renameProject,
    starredProjects,
    toggleStar
  }
}
