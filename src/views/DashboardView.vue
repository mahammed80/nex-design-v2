<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener, useLocalStorage } from '@vueuse/core'
import { readFigFile, exportFigFile } from '@nex-design/core/io/formats/fig'
import { createEditorStore } from '@/app/editor/session'
import { createDemoShapes } from '@/app/demo/document'
import UserMenu from '@/components/Auth/UserMenu.vue'
import {
  openDb,
  getAllProjectsFromDb,
  createProjectInDb,
  updateProjectInDb,
  deleteProjectInDb,
  duplicateProjectInDb,
  uint8ArrayToBase64,
  type ProjectRecord
} from '@/app/dashboard/db'

const router = useRouter()

// UI state
const activeView = ref<'home' | 'recents' | 'starred' | 'projects' | 'folder-ui-ux' | 'folder-design-systems' | 'folder-web-apps'>('home')
const activeFilterTab = ref<'recents' | 'shared-docs' | 'shared-folders'>('recents')
const searchQuery = ref('')
const sortBy = ref<'modified' | 'created' | 'name'>('modified')
const viewMode = ref<'grid' | 'list'>('list')
const isSettingsOpen = ref(false)
const isSearchOpen = ref(false)
const isNewFolderModalOpen = ref(false)
const newFolderName = ref('')
const searchFilter = ref('')
const selectedSearchIndex = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const profileName = useLocalStorage('nex-design:profile-name', 'Alex')

// Tree Collapse State
const isOverviewExpanded = ref(true)
const isUiUxExpanded = ref(true)
const isProductDesignsExpanded = ref(true)

// Selected project for bottom preview dock
const selectedProject = ref<ProjectRecord | null>(null)

function saveProfileName() {
  isSettingsOpen.value = false
}

// Project records
const projects = ref<ProjectRecord[]>([])
const loading = ref(true)

// Realistic Folders with Dark Red / Crimson & Accent Themes
const mockFolders = ref([
  {
    id: 'folder-1',
    name: 'Dashboard Designs',
    fileCount: 62,
    size: '2.6 GB',
    tabColor: '#be123c',
    tabBg: 'linear-gradient(135deg, #e11d48, #9f1239)',
    members: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80'],
    moreCount: 0
  },
  {
    id: 'folder-2',
    name: 'Figma Files',
    fileCount: 202,
    size: '2.6 GB',
    tabColor: '#9f1239',
    tabBg: 'linear-gradient(135deg, #be123c, #881337)',
    members: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80'],
    moreCount: 12
  },
  {
    id: 'folder-3',
    name: 'Product Components',
    fileCount: 12,
    size: '840 MB',
    tabColor: '#881337',
    tabBg: 'linear-gradient(135deg, #9f1239, #4c0519)',
    members: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80'],
    moreCount: 4
  }
])

// Load projects from database
async function loadProjects() {
  loading.value = true
  try {
    const db = await openDb()
    let list = await getAllProjectsFromDb(db)
    
    // Seed default demo project if empty
    if (list.length === 0) {
      await seedDemoProject(db)
      list = await getAllProjectsFromDb(db)
    }
    
    projects.value = list
    if (list.length > 0 && !selectedProject.value) {
      selectedProject.value = list[0]
    }
  } catch (err) {
    console.error('Failed to load projects:', err)
  } finally {
    loading.value = false
  }
}

// Seed the default demo project
async function seedDemoProject(db: IDBDatabase) {
  const store = createEditorStore()
  createDemoShapes(store)
  
  const docBytes = await exportFigFile(store.graph)
  let thumbnail = ''
  try {
    const renderData = await store.renderExportImage([], 0.5, 'PNG')
    if (renderData) {
      thumbnail = uint8ArrayToBase64(renderData)
    }
  } catch (e) {
    console.warn('Failed to render demo thumbnail', e)
  }
  
  await createProjectInDb(db, {
    id: 'demo-project-id',
    name: 'Cloud Dashboard.fig',
    document: docBytes,
    thumbnail,
    starred: true,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2
  })

  await createProjectInDb(db, {
    id: 'demo-project-2',
    name: 'Project Brief.docx',
    document: docBytes,
    thumbnail: '',
    starred: false,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5
  })

  await createProjectInDb(db, {
    id: 'demo-project-3',
    name: 'Project Details.xls',
    document: docBytes,
    thumbnail: '',
    starred: false,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12
  })

  await createProjectInDb(db, {
    id: 'demo-project-4',
    name: 'Design Notes.docx',
    document: docBytes,
    thumbnail: '',
    starred: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24
  })
  
  store.dispose()
}

// Filtered and sorted projects
const filteredProjects = computed(() => {
  let list = [...projects.value]

  if (activeView.value === 'starred') {
    list = list.filter((p) => p.starred)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(query))
  }

  list.sort((a, b) => {
    if (sortBy.value === 'modified') return b.updatedAt - a.updatedAt
    if (sortBy.value === 'created') return b.createdAt - a.createdAt
    if (sortBy.value === 'name') return a.name.localeCompare(b.name)
    return 0
  })

  return list
})

const starredProjects = computed(() => projects.value.filter((p) => p.starred))

const searchDialogMatches = computed(() => {
  const query = searchFilter.value.trim().toLowerCase()
  if (!query) return projects.value.slice(0, 5)
  return projects.value.filter((p) => p.name.toLowerCase().includes(query))
})

async function createNewDesign() {
  const db = await openDb()
  const store = createEditorStore()
  store.graph.addPage('Page 1')
  const docBytes = await exportFigFile(store.graph)
  
  const id = crypto.randomUUID()
  const newProject: ProjectRecord = {
    id,
    name: 'Untitled.fig',
    thumbnail: '',
    starred: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    document: docBytes
  }

  await createProjectInDb(db, newProject)
  store.dispose()
  openProject(id)
}

function openProject(id: string) {
  router.push(`/editor?id=${id}`)
}

async function toggleStar(project: ProjectRecord) {
  try {
    const db = await openDb()
    await updateProjectInDb(db, project.id, { starred: !project.starred })
    await loadProjects()
  } catch (err) {
    console.error('Failed to toggle star:', err)
  }
}

async function duplicateProject(project: ProjectRecord) {
  try {
    const db = await openDb()
    await duplicateProjectInDb(db, project.id)
    await loadProjects()
  } catch (err) {
    console.error('Failed to duplicate project:', err)
  }
}

async function deleteProject(project: ProjectRecord) {
  if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return
  try {
    const db = await openDb()
    await deleteProjectInDb(db, project.id)
    await loadProjects()
  } catch (err) {
    console.error('Failed to delete project:', err)
  }
}

function handleImportClick() {
  fileInput.value?.click()
}

async function handleImportFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  loading.value = true
  try {
    const isFig = file.name.toLowerCase().endsWith('.fig')
    if (!isFig) {
      alert('Only .fig files are supported currently.')
      return
    }

    const name = file.name.replace(/\.[^.]+$/i, '')
    const graph = await readFigFile(file, { populate: 'first-page' })
    const docBytes = await exportFigFile(graph)

    const db = await openDb()
    const id = crypto.randomUUID()
    const importedProject: ProjectRecord = {
      id,
      name: `${name}.fig`,
      thumbnail: '',
      starred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      document: docBytes
    }

    await createProjectInDb(db, importedProject)
    openProject(id)
  } catch (err) {
    console.error('Failed to import file:', err)
    alert('Failed to parse .fig file. Make sure it is a valid NexDesign / Figma file.')
  } finally {
    loading.value = false
  }
}

function openSearchPalette() {
  isSearchOpen.value = true
  searchFilter.value = ''
  selectedSearchIndex.value = 0
}

function handleSearchKeyDown(e: KeyboardEvent) {
  if (!isSearchOpen.value) return

  const maxIndex = searchDialogMatches.value.length - 1
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedSearchIndex.value = Math.min(selectedSearchIndex.value + 1, maxIndex)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedSearchIndex.value = Math.max(selectedSearchIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selected = searchDialogMatches.value[selectedSearchIndex.value]
    if (selected) {
      openProject(selected.id)
    }
  } else if (e.key === 'Escape') {
    isSearchOpen.value = false
  }
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    openSearchPalette()
  }
})

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'Just now'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(timestamp).toLocaleDateString()
}

function getFileIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.fig')) return { bg: '#e11d48', label: 'FIG', color: '#ffe4e6' }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return { bg: '#9f1239', label: 'W', color: '#fecdd3' }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return { bg: '#881337', label: 'X', color: '#fda4af' }
  return { bg: '#be123c', label: 'UI', color: '#fff1f2' }
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <!-- ══════════════════════════════════════════════════════════════════
       NexDesign Cloud Dock — Dark Red / Crimson & Folder Geometry
  ══════════════════════════════════════════════════════════════════════ -->
  <div class="flex h-screen w-screen overflow-hidden font-sans text-[#f4e8eb] relative"
       style="background: radial-gradient(ellipse at 0% 0%, #1f080e 0%, #0d0407 45%, #050103 100%);">

    <!-- Ambient Dark Red Glow Orbs -->
    <div class="bg-ambient" />
    <div class="absolute inset-0 bg-grid z-[1] opacity-40 pointer-events-none" />

    <!-- ════════ 1. SLIM ICON DOCK (FAR LEFT RAIL) ════════ -->
    <aside class="cloud-dock-rail relative z-20 w-[64px] shrink-0 flex flex-col items-center justify-between py-6 select-none">
      <div class="flex flex-col items-center gap-6 w-full">
        <!-- Logo Symbol (Dark Red Gradient) -->
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-lg shadow-rose-600/40 cursor-pointer hover:scale-105 transition-transform"
             @click="activeView = 'home'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>

        <!-- Vertical Dock Action Icons -->
        <nav class="flex flex-col items-center gap-3 w-full px-2">
          <!-- Apps / Dashboard (Active) -->
          <button
            @click="activeView = 'home'"
            type="button"
            title="Dashboard Overview"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="activeView === 'home' || activeView === 'recents' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>

          <!-- Shared / Link -->
          <button
            @click="activeView = 'folder-ui-ux'"
            type="button"
            title="Shared Files"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="activeView === 'folder-ui-ux' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>

          <!-- Cloud Import -->
          <button
            @click="handleImportClick"
            type="button"
            title="Import .fig File"
            class="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>

          <!-- Starred -->
          <button
            @click="activeView = 'starred'"
            type="button"
            title="Starred Projects"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="activeView === 'starred' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>

          <!-- Plus Create New -->
          <button
            @click="createNewDesign"
            type="button"
            title="Create New Canvas"
            class="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-rose-500/40 transition-all duration-200"
          >
            <svg class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </nav>
      </div>

      <!-- Dock Bottom Tools -->
      <div class="flex flex-col items-center gap-3 w-full px-2">
        <button
          @click="router.push('/admin')"
          type="button"
          title="Admin Dashboard"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-300 hover:bg-rose-600/15 transition-colors"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg>
        </button>

        <button
          @click="isSettingsOpen = true"
          type="button"
          title="Settings"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </aside>

    <!-- ════════ 2. HIERARCHY TREE SIDEBAR ════════ -->
    <aside class="glass-sidebar relative z-10 w-[270px] shrink-0 flex flex-col justify-between select-none border-r border-white/5">
      <div class="flex flex-col pt-5 flex-1 overflow-y-auto scrollbar-none px-4">
        <!-- Sidebar Header: << Dashboard -->
        <div class="flex items-center justify-between mb-5 px-1">
          <div class="flex items-center gap-2 text-white font-bold text-sm tracking-tight cursor-pointer hover:text-rose-300 transition-colors"
               @click="activeView = 'home'">
            <span class="text-xs text-zinc-500 font-mono">«</span>
            <span>Dashboard</span>
          </div>
          <button @click="isSettingsOpen = true" class="size-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 flex items-center justify-center transition-colors">
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <!-- Search Input with Cmd+K -->
        <div class="mb-5">
          <button
            @click="openSearchPalette"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400 hover:text-white hover:border-rose-500/30 transition-all duration-200"
          >
            <div class="flex items-center gap-2.5">
              <svg class="size-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search</span>
            </div>
            <span class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">⌘ K</span>
          </button>
        </div>

        <!-- ── HIERARCHY TREE ACCORDION ── -->
        <div class="space-y-3 text-xs">
          <!-- 1. OVERVIEW ACCORDION (Dark Red Active Pill) -->
          <div>
            <button
              @click="isOverviewExpanded = !isOverviewExpanded; activeView = 'home'"
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              :class="activeView === 'home' || activeView === 'recents' ? 'active-dark-red-pill text-white' : 'text-zinc-300 hover:bg-white/5'"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-sm">📁</span>
                <span>Overview</span>
              </div>
              <svg class="size-3.5 transition-transform" :class="{ 'rotate-180': !isOverviewExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>

            <!-- Overview Tree Branches -->
            <div v-show="isOverviewExpanded" class="tree-branch-line ml-4 pl-4 pt-1.5 space-y-1">
              <div
                @click="activeView = 'home'"
                class="tree-branch-item flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors"
                :class="activeView === 'home' ? 'text-rose-300 font-semibold bg-rose-600/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
              >
                <span>My Overview</span>
                <svg class="size-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>

              <div
                @click="activeView = 'recents'"
                class="tree-branch-item flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors"
                :class="activeView === 'recents' ? 'text-rose-300 font-semibold bg-rose-600/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
              >
                <span>Recent Activity</span>
                <span class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">242</span>
              </div>
            </div>
          </div>

          <!-- 2. STARRED FILES -->
          <div
            @click="activeView = 'starred'"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors"
            :class="activeView === 'starred' ? 'bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-amber-400">⭐</span>
              <span>Starred Files</span>
            </div>
            <span v-if="starredProjects.length > 0" class="text-[10px] font-mono text-zinc-500">{{ starredProjects.length }}</span>
          </div>

          <!-- 3. UI & UX DESIGN (Tree Branch) -->
          <div>
            <button
              @click="isUiUxExpanded = !isUiUxExpanded; activeView = 'folder-ui-ux'"
              class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <div class="flex items-center gap-2.5">
                <span>📁</span>
                <span>UI & UX Design</span>
              </div>
              <svg class="size-3.5 text-zinc-500 transition-transform" :class="{ 'rotate-180': !isUiUxExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>

            <!-- Nested Products Designs -->
            <div v-show="isUiUxExpanded" class="tree-branch-line ml-4 pl-4 pt-1 space-y-1">
              <div>
                <button
                  @click="isProductDesignsExpanded = !isProductDesignsExpanded"
                  class="w-full tree-branch-item flex items-center justify-between py-1.5 px-2.5 rounded-lg text-zinc-300 hover:text-white transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs">📁</span>
                    <span>Products Designs</span>
                  </div>
                  <svg class="size-3 text-zinc-500 transition-transform" :class="{ 'rotate-180': !isProductDesignsExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>

                <!-- Sub-items under Products Designs -->
                <div v-show="isProductDesignsExpanded" class="tree-branch-line ml-4 pl-4 pt-1 space-y-1">
                  <div @click="activeView = 'projects'" class="tree-branch-item py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    Course Dashboard
                  </div>
                  <div @click="activeView = 'projects'" class="tree-branch-item py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    KDS Dashboard
                  </div>
                  <div @click="activeView = 'projects'" class="tree-branch-item flex items-center justify-between py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                    <span>📁 Drapora Projects</span>
                    <svg class="size-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. DESIGN SYSTEMS -->
          <div
            @click="activeView = 'folder-design-systems'"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <span>📁</span>
              <span>Design Systems</span>
            </div>
            <svg class="size-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <!-- 5. WEB APPS -->
          <div
            @click="activeView = 'folder-web-apps'"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <span>📁</span>
              <span>Web Apps</span>
            </div>
            <svg class="size-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <!-- + New Folder Button -->
          <div class="pt-2">
            <button
              @click="isNewFolderModalOpen = true"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10 text-xs transition-colors"
            >
              <span class="size-4 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center text-xs font-bold">+</span>
              <span>New Folder</span>
            </button>
          </div>
        </div>

        <!-- ── ROCKET UPGRADE CARD (Dark Red / Ruby Gradient) ── -->
        <div class="my-6 p-4 rounded-2xl relative overflow-hidden bg-gradient-to-br from-rose-950/70 via-red-950/50 to-rose-950/70 border border-rose-500/20 shadow-xl">
          <div class="flex items-start justify-between">
            <!-- 3D Rocket Icon -->
            <div class="text-3xl filter drop-shadow-[0_4px_12px_rgba(225,29,72,0.5)]">
              🚀
            </div>
            <button class="text-zinc-500 hover:text-zinc-300">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>

          <div class="mt-2.5 space-y-1">
            <h4 class="text-xs font-bold text-white tracking-tight">Trial Ending Soon !</h4>
            <p class="text-[10px] text-zinc-400 leading-relaxed">Your access expires in 6 days. Upgrade now for access!</p>
          </div>

          <button
            @click="router.push('/admin')"
            class="w-full mt-3.5 py-2 px-3 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>✨</span>
            <span>Upgrade to Pro</span>
          </button>
        </div>
      </div>

      <!-- User Profile at bottom -->
      <div class="px-3 pb-4 pt-2 border-t border-white/5">
        <UserMenu />
      </div>
    </aside>

    <!-- ════════ 3. MAIN DASHBOARD CONTENT AREA ════════ -->
    <div class="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-zinc-950/60 via-zinc-900/30 to-zinc-950/80">
      
      <!-- Top Sticky Header -->
      <header class="glass-header h-[64px] flex items-center justify-between px-8 shrink-0 z-30 sticky top-0">
        <!-- Storage Pill & Breadcrumbs -->
        <div class="flex items-center gap-6">
          <!-- Cloud Storage Indicator (Dark Red / Crimson Theme) -->
          <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs">
            <span class="text-base text-rose-400">☁️</span>
            <div>
              <div class="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-300">
                <span>Basic Storage</span>
                <span class="text-zinc-500">50GB / 100GB</span>
              </div>
              <div class="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div class="w-1/2 h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full" />
              </div>
            </div>
          </div>

          <!-- Breadcrumbs -->
          <div class="hidden lg:flex items-center gap-2 text-xs text-zinc-400">
            <span class="hover:text-white cursor-pointer">Dashboard</span>
            <span>/</span>
            <span class="text-zinc-200 font-medium">Overview</span>
            <span>/</span>
            <span class="text-zinc-400">Recent Activity</span>
            <span class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">242</span>
          </div>
        </div>

        <!-- Header Action Buttons (Dark Red Theme) -->
        <div class="flex items-center gap-3">
          <button
            @click="handleImportClick"
            type="button"
            class="h-9 px-4 rounded-xl text-xs font-semibold text-zinc-300 glass-panel hover:text-white hover:border-rose-500/40 transition-all flex items-center gap-2"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Import .fig</span>
          </button>

          <button
            @click="createNewDesign"
            type="button"
            class="h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New Design</span>
          </button>
        </div>
      </header>

      <!-- Scrollable Main Dashboard Canvas -->
      <main class="flex-1 overflow-y-auto scrollbar-thin px-8 py-6 space-y-8">

        <!-- ── SECTION 1: RECENT EDITED ── -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-white tracking-tight">Recent edited</h2>
            <button @click="activeView = 'recents'" class="text-xs text-rose-400 hover:text-rose-300">View all</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="item in projects.slice(0, 4)"
              :key="item.id"
              @click="selectedProject = item"
              class="glass-card rounded-2xl p-4 cursor-pointer relative group transition-all duration-300"
              :class="selectedProject?.id === item.id ? 'ring-2 ring-rose-500/50 bg-rose-950/20' : ''"
            >
              <div class="flex items-start gap-3.5">
                <!-- Icon badge -->
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow"
                     :style="{ backgroundColor: getFileIcon(item.name).bg, color: getFileIcon(item.name).color }">
                  {{ getFileIcon(item.name).label }}
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">{{ item.name }}</h4>
                  <p class="text-[10px] text-zinc-400 mt-0.5">Edited {{ formatTimeAgo(item.updatedAt) }}</p>
                </div>

                <button @click.stop="openProject(item.id)" class="text-zinc-500 hover:text-white">
                  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>

              <!-- Hover "See details" Pill button -->
              <div class="mt-4 flex items-center justify-end">
                <button
                  @click.stop="openProject(item.id)"
                  class="px-3 py-1 rounded-full text-[10px] font-bold text-white bg-zinc-900 border border-white/10 hover:bg-rose-600 hover:border-rose-500 transition-all"
                >
                  See details
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 2: SHARED FOLDERS (REALISTIC FOLDER SHAPE GEOMETRY) ── -->
        <div class="space-y-4 pt-2">
          <h2 class="text-sm font-bold text-white tracking-tight">Shared Folders</h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3">
            <div
              v-for="folder in mockFolders"
              :key="folder.id"
              class="relative pt-6 group cursor-pointer"
            >
              <!-- 1. Authentically Raised Folder Tab on Top-Left -->
              <div
                class="absolute top-0 left-0 h-7 px-4 rounded-t-xl flex items-center gap-2 border-t border-x border-white/10 z-10"
                :style="{ background: folder.tabBg }"
              >
                <!-- Folder Mini Icon -->
                <span class="text-xs">📁</span>
                <span class="text-[11px] font-bold text-white truncate max-w-[100px]">{{ folder.name }}</span>
              </div>

              <!-- 2. Main Folder Sleeve Body (Cutout Under Tab) -->
              <div class="folder-realistic-card glass-card p-5 relative overflow-hidden group-hover:border-rose-500/50 shadow-2xl transition-all duration-300">
                <!-- Inner Sleeve Drop Line -->
                <div class="absolute top-0 right-0 left-28 h-px bg-white/10" />

                <div class="flex flex-col justify-between h-full space-y-4 pt-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">{{ folder.name }}</h3>
                      <p class="text-[11px] text-zinc-400 mt-0.5">{{ folder.fileCount }} files, {{ folder.size }}</p>
                    </div>

                    <span class="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded-full bg-zinc-900/80 border border-white/5">
                      {{ folder.size }}
                    </span>
                  </div>

                  <!-- Members Avatar Stack -->
                  <div class="flex items-center justify-between pt-3 border-t border-white/5">
                    <div class="flex items-center -space-x-2">
                      <img
                        v-for="(avatar, i) in folder.members"
                        :key="i"
                        :src="avatar"
                        class="w-6 h-6 rounded-full border-2 border-zinc-950 object-cover"
                        alt="Member"
                      />
                      <span v-if="folder.moreCount > 0" class="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 text-[9px] font-bold text-zinc-300 flex items-center justify-center">
                        +{{ folder.moreCount }}
                      </span>
                    </div>

                    <span class="text-xs text-zinc-500 group-hover:text-rose-400 transition-colors">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 3: FILE LIST & FILTER PILLS ── -->
        <div class="space-y-4 pt-2">
          <!-- Filter Tabs -->
          <div class="flex items-center justify-between pb-3 border-b border-white/5">
            <div class="flex items-center gap-2">
              <button
                @click="activeFilterTab = 'recents'"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                :class="activeFilterTab === 'recents' ? 'bg-zinc-900 text-white border border-white/10 shadow' : 'text-zinc-400 hover:text-white'"
              >
                <span v-if="activeFilterTab === 'recents'" class="text-rose-400">✓</span>
                <span>Recently Opened</span>
              </button>

              <button
                @click="activeFilterTab = 'shared-docs'"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                :class="activeFilterTab === 'shared-docs' ? 'bg-zinc-900 text-white border border-white/10 shadow' : 'text-zinc-400 hover:text-white'"
              >
                Shared Documents
              </button>

              <button
                @click="activeFilterTab = 'shared-folders'"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                :class="activeFilterTab === 'shared-folders' ? 'bg-zinc-900 text-white border border-white/10 shadow' : 'text-zinc-400 hover:text-white'"
              >
                Shared Folders
              </button>
            </div>

            <!-- Search filter in list -->
            <div class="relative w-64">
              <svg class="size-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Filter files..."
                class="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/60 border border-white/5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          <!-- Data Table (Dark Red Accents) -->
          <div class="rounded-2xl glass-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-white/5 bg-zinc-950/60 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th class="py-3 px-4 w-8">
                      <input type="checkbox" class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0" />
                    </th>
                    <th class="py-3 px-4">File Name</th>
                    <th class="py-3 px-4">Owner</th>
                    <th class="py-3 px-4">Last Modified</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-white/5 text-xs text-zinc-300">
                  <tr
                    v-for="project in filteredProjects"
                    :key="project.id"
                    @click="selectedProject = project"
                    class="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    :class="selectedProject?.id === project.id ? 'bg-rose-950/25' : ''"
                  >
                    <!-- Checkbox -->
                    <td class="py-3.5 px-4" @click.stop>
                      <input type="checkbox" :checked="selectedProject?.id === project.id" class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0" />
                    </td>

                    <!-- File Name & Icon -->
                    <td class="py-3.5 px-4 font-semibold text-white">
                      <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow"
                             :style="{ backgroundColor: getFileIcon(project.name).bg, color: getFileIcon(project.name).color }">
                          {{ getFileIcon(project.name).label }}
                        </div>
                        <div>
                          <div class="hover:text-rose-300 transition-colors" @click="openProject(project.id)">
                            {{ project.name }}
                          </div>
                          <div class="text-[10px] text-zinc-500 font-normal flex items-center gap-1.5">
                            <span>Shared 👥</span>
                            <span v-if="project.starred" class="text-amber-400">• Starred ⭐</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Owner Avatars -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center -space-x-1.5">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80" class="w-6 h-6 rounded-full border border-zinc-950 object-cover" />
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80" class="w-6 h-6 rounded-full border border-zinc-950 object-cover" />
                        <span class="w-6 h-6 rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center border border-zinc-950">+2</span>
                      </div>
                    </td>

                    <!-- Modified -->
                    <td class="py-3.5 px-4 text-zinc-400 text-[11px]">
                      {{ formatTimeAgo(project.updatedAt) }}
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 px-4 text-right" @click.stop>
                      <div class="flex items-center justify-end gap-1">
                        <button @click="toggleStar(project)" class="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-amber-400">
                          <svg class="size-3.5" :class="{ 'fill-amber-400 text-amber-400': project.starred }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </button>
                        <button @click="openProject(project.id)" class="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white text-[10px] font-bold transition-all">
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      <!-- ════ 4. FLOATING BOTTOM SELECTION STATUS BAR ════ -->
      <footer v-if="selectedProject" class="h-12 border-t border-white/5 bg-zinc-950/90 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-30">
        <div class="flex items-center gap-3 text-xs">
          <span class="text-sm">🎨</span>
          <span class="font-bold text-white">{{ selectedProject.name }}</span>
          <span class="text-zinc-500">•</span>
          <span class="text-zinc-400 text-[11px]">1.5 GB</span>
          <span class="text-zinc-500">•</span>
          <span class="text-zinc-400 text-[11px]">{{ new Date(selectedProject.updatedAt).toLocaleDateString() }}</span>
        </div>

        <div class="flex items-center gap-3">
          <span class="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold flex items-center gap-1">
            <span>🔒</span> Restricted Access
          </span>

          <button
            @click="openProject(selectedProject.id)"
            class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Open Canvas</span>
            <span>→</span>
          </button>
        </div>
      </footer>

    </div>

    <!-- Hidden Input for Importing .fig file -->
    <input type="file" ref="fileInput" accept=".fig" class="hidden" @change="handleImportFile" />

    <!-- Search Palette Dialog -->
    <div v-if="isSearchOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md"
         @click.self="isSearchOpen = false">
      <div class="w-full max-w-lg glass-modal rounded-2xl overflow-hidden shadow-2xl animate-scale-up" @keydown="handleSearchKeyDown">
        <div class="relative border-b border-white/[0.06]">
          <svg class="size-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchFilter" type="text" placeholder="Search projects, files, designs…"
                 class="w-full h-14 pl-12 pr-4 bg-transparent text-[13px] text-white focus:outline-none placeholder-zinc-500"
                 autofocus />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">ESC to close</span>
        </div>
        <div class="max-h-80 overflow-y-auto p-2">
          <div v-if="searchDialogMatches.length > 0">
            <div class="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Projects</div>
            <div
              v-for="(match, index) in searchDialogMatches"
              :key="match.id"
              class="px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              :class="index === selectedSearchIndex ? 'bg-rose-600/20 text-white' : 'text-zinc-400 hover:bg-white/[0.03]'"
              @mouseenter="selectedSearchIndex = index"
              @click="openProject(match.id)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-rose-400">📄</span>
                <span class="text-[12px] font-medium truncate">{{ match.name }}</span>
              </div>
              <span class="text-[9px] font-mono text-zinc-500 shrink-0">Edited {{ formatTimeAgo(match.updatedAt) }}</span>
            </div>
          </div>
          <div v-else class="py-10 text-center text-[12px] text-zinc-500">No results for "{{ searchFilter }}"</div>
        </div>
      </div>
    </div>

    <!-- New Folder Dialog Modal -->
    <div v-if="isNewFolderModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
         @click.self="isNewFolderModalOpen = false">
      <div class="w-full max-w-sm glass-modal rounded-2xl p-6 shadow-2xl animate-scale-up space-y-4">
        <h3 class="text-sm font-bold text-white">Create New Folder</h3>
        <div>
          <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Folder Name</label>
          <input v-model="newFolderName" type="text" placeholder="e.g. Mobile Design Kit"
                 class="glass-input h-9 px-3.5 rounded-xl text-[12px] text-white w-full" />
        </div>
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button @click="isNewFolderModalOpen = false" class="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white">Cancel</button>
          <button @click="isNewFolderModalOpen = false; newFolderName = ''" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500">Create</button>
        </div>
      </div>
    </div>

    <!-- Workspace Settings Modal -->
    <div v-if="isSettingsOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
         @click.self="isSettingsOpen = false">
      <div class="w-full max-w-sm glass-modal rounded-2xl p-6 shadow-2xl animate-scale-up">
        <h3 class="text-sm font-bold text-white mb-5">Workspace Settings</h3>
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Display Name</label>
            <input v-model="profileName" type="text"
                   class="glass-input h-9 px-3.5 rounded-xl text-[12px] text-white w-full" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2.5 mt-6">
          <button @click="isSettingsOpen = false" type="button"
                  class="h-9 px-4 rounded-xl glass-panel text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button @click="saveProfileName" type="button"
                  class="h-9 px-4 rounded-xl text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500">
            Save Changes
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.animate-scale-up {
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
</style>