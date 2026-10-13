<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener, useLocalStorage } from '@vueuse/core'
import { readFigFile, exportFigFile } from '@nex-design/core/io/formats/fig'
import { createEditorStore } from '@/app/editor/session'
import { createDemoShapes } from '@/app/demo/document'
import UserMenu from '@/components/Auth/UserMenu.vue'
import { useAuthStore } from '@/app/auth/store'
import {
  openDb,
  getAllProjectsFromDb,
  createProjectInDb,
  updateProjectInDb,
  uint8ArrayToBase64,
  type ProjectRecord
} from '@/app/dashboard/db'
import { getActiveProfile, getGuestTrialStatus } from '@/app/dashboard/accounts/session'
import { useAppTheme } from '@/app/shell/theme'

interface DashboardFolder {
  id: string
  name: string
  fileCount: number
  size: string
  tabBg: string
}

const router = useRouter()
const { isLight, toggleTheme } = useAppTheme()
const { currentUser, openProfileModal } = useAuthStore()

// UI state
const activeView = ref<
  | 'home'
  | 'recents'
  | 'starred'
  | 'projects'
  | 'folder-ui-ux'
  | 'folder-design-systems'
  | 'folder-web-apps'
>('home')
const activeFilterTab = ref<'recents' | 'shared-docs' | 'shared-folders'>('recents')
const searchQuery = ref('')
const sortBy = ref<'modified' | 'created' | 'name'>('modified')
const isSettingsOpen = ref(false)
const isSearchOpen = ref(false)
const isNewFolderModalOpen = ref(false)
const newFolderName = ref('')
const customFolderNames = useLocalStorage<string[]>('nex-design:dashboard-folders', [])
const selectedDashboardFolderId = ref<string | null>(null)
const searchFilter = ref('')
const selectedSearchIndex = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const profileName = useLocalStorage('nex-design:profile-name', 'Alex')
const guestTrial = computed(() => getGuestTrialStatus(getActiveProfile()))

function getRequiredProfileId(): string {
  const profileId = getActiveProfile()?.id
  if (!profileId) throw new Error('An active local profile is required')
  return profileId
}

// Tree Collapse State
const isOverviewExpanded = ref(true)
const isUiUxExpanded = ref(true)
const isProductDesignsExpanded = ref(true)

// Selected project for bottom preview dock
const selectedProject = ref<ProjectRecord | null>(null)

function saveProfileName() {
  isSettingsOpen.value = false
}

function createFolder(): void {
  const name = newFolderName.value.trim()
  if (!name) return
  if (!customFolderNames.value.some((folder) => folder.toLowerCase() === name.toLowerCase())) {
    customFolderNames.value = [...customFolderNames.value, name]
  }
  newFolderName.value = ''
  isNewFolderModalOpen.value = false
}

// Project records
const projects = ref<ProjectRecord[]>([])
const loading = ref(true)

const dashboardFolders = computed<DashboardFolder[]>(() => {
  const localProjects = projects.value.filter((project) => !project.remoteId)
  const sharedProjects = projects.value.filter((project) => Boolean(project.remoteId))
  const starred = projects.value.filter((project) => project.starred)
  const folderFromProjects = (
    id: string,
    name: string,
    records: ProjectRecord[],
    tabBg: string
  ): DashboardFolder => ({
    id,
    name,
    fileCount: records.length,
    size: formatBytes(records.reduce((total, project) => total + project.document.byteLength, 0)),
    tabBg
  })

  return [
    folderFromProjects('local', 'Local Projects', localProjects, 'linear-gradient(135deg, #991b1b, #450a0a)'),
    folderFromProjects('shared', 'Shared Projects', sharedProjects, 'linear-gradient(135deg, #7f1d1d, #450a0a)'),
    folderFromProjects('starred', 'Starred Projects', starred, 'linear-gradient(135deg, #671010, #260606)'),
    ...customFolderNames.value.map((name) => ({
      id: `custom-${name}`,
      name,
      fileCount: 0,
      size: '0 B',
      tabBg: 'linear-gradient(135deg, #7f1d1d, #450a0a)'
    }))
  ]
})

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
  const profileId = getRequiredProfileId()
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
    profileId,
    name: 'Cloud Dashboard.fig',
    document: docBytes,
    thumbnail,
    starred: true,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2
  })

  await createProjectInDb(db, {
    id: 'demo-project-2',
    profileId,
    name: 'Project Brief.docx',
    document: docBytes,
    thumbnail: '',
    starred: false,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5
  })

  await createProjectInDb(db, {
    id: 'demo-project-3',
    profileId,
    name: 'Project Details.xls',
    document: docBytes,
    thumbnail: '',
    starred: false,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12
  })

  await createProjectInDb(db, {
    id: 'demo-project-4',
    profileId,
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

  if (activeFilterTab.value === 'shared-docs') {
    list = list.filter((p) => Boolean(p.remoteId))
  } else if (activeFilterTab.value === 'shared-folders') {
    if (selectedDashboardFolderId.value === 'local') {
      list = list.filter((p) => !p.remoteId)
    } else if (selectedDashboardFolderId.value === 'shared') {
      list = list.filter((p) => Boolean(p.remoteId))
    } else if (selectedDashboardFolderId.value === 'starred') {
      list = list.filter((p) => p.starred)
    } else {
      list = []
    }
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
const totalStorageBytes = computed(() =>
  projects.value.reduce((total, project) => total + project.document.byteLength, 0)
)
const storageUsagePercent = computed(() => Math.min((totalStorageBytes.value / 1073741824) * 100, 100))

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

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
    profileId: getRequiredProfileId(),
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

const stitchTemplates = [
  {
    id: 'stitch-dashboard',
    title: 'AI Command Center',
    category: 'Dashboard UI',
    gradient: 'from-red-950/55 via-red-900/35 to-rose-950/45',
    border: 'border-red-900/50',
    tag: 'Stitch AI'
  },
  {
    id: 'stitch-landing',
    title: 'Glass SaaS Landing',
    category: 'Marketing Hero',
    gradient: 'from-red-900/45 via-rose-950/50 to-red-950/60',
    border: 'border-red-800/50',
    tag: 'Frosted Glass'
  },
  {
    id: 'stitch-wallet',
    title: 'Mobile Glass Crypto',
    category: 'Mobile App',
    gradient: 'from-stone-950/40 via-red-950/45 to-red-900/35',
    border: 'border-red-950/55',
    tag: 'Fintech'
  },
  {
    id: 'stitch-linear',
    title: 'Obsidian Dev Hub',
    category: 'Developer Platform',
    gradient: 'from-zinc-950/45 via-red-950/50 to-rose-950/45',
    border: 'border-red-900/50',
    tag: 'Dev Tools'
  }
]

async function createDesignFromTemplate(templateName: string) {
  const db = await openDb()
  const store = createEditorStore()
  createDemoShapes(store)
  const docBytes = await exportFigFile(store.graph)

  const id = crypto.randomUUID()
  const newProject: ProjectRecord = {
    id,
    profileId: getRequiredProfileId(),
    name: `${templateName}.fig`,
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
      profileId: getRequiredProfileId(),
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
  if (lower.endsWith('.fig')) return { bg: '#7f1d1d', label: 'FIG', color: '#fee2e2' }
  if (lower.endsWith('.docx') || lower.endsWith('.doc'))
    return { bg: '#671010', label: 'W', color: '#fecaca' }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx'))
    return { bg: '#450a0a', label: 'X', color: '#fca5a5' }
  return { bg: '#7f1d1d', label: 'UI', color: '#fef2f2' }
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <!-- ══════════════════════════════════════════════════════════════════
       NexDesign Cloud Dock — Dark Red / Crimson & Folder Geometry
  ══════════════════════════════════════════════════════════════════════ -->
  <div
    class="dashboard-shell flex h-screen w-screen overflow-hidden font-sans relative"
  >
    <!-- Ambient Dark Red Glow Orbs -->
    <div class="bg-ambient" />
    <div class="absolute inset-0 bg-grid z-[1] opacity-40 pointer-events-none" />

    <!-- ════════ 1. SLIM ICON DOCK (FAR LEFT RAIL) ════════ -->
    <aside
      class="cloud-dock-rail relative z-20 w-[64px] shrink-0 flex flex-col items-center justify-between py-6 select-none"
    >
      <div class="flex flex-col items-center gap-6 w-full">
        <!-- Logo Symbol (Dark Red Gradient) -->
        <div
          class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-lg shadow-rose-600/40 cursor-pointer hover:scale-105 transition-transform"
          @click="activeView = 'home'"
        >
          <icon-lucide-layers class="size-5 text-white" />
        </div>

        <!-- Vertical Dock Action Icons -->
        <nav class="flex flex-col items-center gap-3 w-full px-2">
          <!-- Apps / Dashboard (Active) -->
          <button
            @click="activeView = 'home'"
            type="button"
            title="Dashboard Overview"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="
              activeView === 'home' || activeView === 'recents'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            "
          >
            <icon-lucide-layout-grid class="size-5" />
          </button>

          <!-- Shared / Link -->
          <button
            @click="activeView = 'folder-ui-ux'"
            type="button"
            title="Shared Files"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="
              activeView === 'folder-ui-ux'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            "
          >
            <icon-lucide-link-2 class="size-5" />
          </button>

          <!-- Cloud Import -->
          <button
            @click="handleImportClick"
            type="button"
            title="Import .fig File"
            class="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200"
          >
            <icon-lucide-download class="size-5" />
          </button>

          <!-- Starred -->
          <button
            @click="activeView = 'starred'"
            type="button"
            title="Starred Projects"
            class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
            :class="
              activeView === 'starred'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/40'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            "
          >
            <icon-lucide-star class="size-5" />
          </button>

          <!-- Plus Create New -->
          <button
            @click="createNewDesign"
            type="button"
            title="Create New Canvas"
            class="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-rose-500/40 transition-all duration-200"
          >
            <icon-lucide-plus class="size-4.5" />
          </button>
        </nav>
      </div>

      <!-- Dock Bottom Tools -->
      <div class="flex flex-col items-center gap-3 w-full px-2">
        <button
          v-if="currentUser?.role === 'admin' || currentUser?.email?.toLowerCase().includes('admin')"
          @click="router.push('/admin')"
          type="button"
          title="Admin Dashboard"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-300 hover:bg-rose-600/15 transition-colors"
        >
          <icon-lucide-shield-check class="size-5" />
        </button>

        <button
          @click="openProfileModal"
          type="button"
          title="User & Profile Settings"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <icon-lucide-settings class="size-5" />
        </button>
      </div>
    </aside>

    <!-- ════════ 2. HIERARCHY TREE SIDEBAR ════════ -->
    <aside
      class="glass-sidebar relative z-10 w-[270px] shrink-0 flex flex-col justify-between select-none border-r border-white/5"
    >
      <div class="flex flex-col pt-5 flex-1 overflow-y-auto scrollbar-none px-4">
        <!-- Sidebar Header: << Dashboard -->
        <div class="flex items-center justify-between mb-5 px-1">
          <div
            class="flex items-center gap-2 text-white font-bold text-sm tracking-tight cursor-pointer hover:text-rose-300 transition-colors"
            @click="activeView = 'home'"
          >
            <icon-lucide-panel-left-close class="size-3.5 text-zinc-500" />
            <span>Dashboard</span>
          </div>
          <button
            @click="openProfileModal"
            title="User & Profile Settings"
            class="size-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <icon-lucide-settings class="size-3.5" />
          </button>
        </div>

        <!-- Search Input with Cmd+K -->
        <div class="mb-5">
          <button
            @click="openSearchPalette"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400 hover:text-white hover:border-rose-500/30 transition-all duration-200"
          >
            <div class="flex items-center gap-2.5">
              <icon-lucide-search class="size-3.5 text-zinc-500" />
              <span>Search</span>
            </div>
            <span
              class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5"
              >⌘ K</span
            >
          </button>
        </div>

        <!-- ── HIERARCHY TREE ACCORDION ── -->
        <div class="space-y-3 text-xs">
          <!-- 1. OVERVIEW ACCORDION (Dark Red Active Pill) -->
          <div>
            <button
              @click="isOverviewExpanded = !isOverviewExpanded; activeView = 'home'"
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              :class="
                activeView === 'home' || activeView === 'recents'
                  ? 'active-dark-red-pill text-white'
                  : 'text-zinc-300 hover:bg-white/5'
              "
            >
              <div class="flex items-center gap-2.5">
                <icon-lucide-folder class="size-4 text-red-300" />
                <span>Overview</span>
              </div>
              <icon-lucide-chevron-up class="size-3.5 transition-transform" :class="{ 'rotate-180': !isOverviewExpanded }" />
            </button>

            <!-- Overview Tree Branches -->
            <div v-show="isOverviewExpanded" class="tree-branch-line ml-4 pl-4 pt-1.5 space-y-1">
              <div
                @click="activeView = 'home'"
                class="tree-branch-item flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors"
                :class="
                  activeView === 'home'
                    ? 'text-rose-300 font-semibold bg-rose-600/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                "
              >
                <span>My Overview</span>
                <icon-lucide-chevron-right class="size-3 text-zinc-600" />
              </div>

              <div
                @click="activeView = 'recents'"
                class="tree-branch-item flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors"
                :class="
                  activeView === 'recents'
                    ? 'text-rose-300 font-semibold bg-rose-600/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                "
              >
                <span>Recent Activity</span>
                <span class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"
                  >{{ projects.length }}</span
                >
              </div>
            </div>
          </div>

          <!-- 2. STARRED FILES -->
          <div
            @click="activeView = 'starred'"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors"
            :class="
              activeView === 'starred'
                ? 'bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            "
          >
            <div class="flex items-center gap-2.5">
              <icon-lucide-star class="size-4 text-red-400" />
              <span>Starred Files</span>
            </div>
            <span v-if="starredProjects.length > 0" class="text-[10px] font-mono text-zinc-500">{{
              starredProjects.length
            }}</span>
          </div>

          <!-- 3. UI & UX DESIGN (Tree Branch) -->
          <div>
            <button
              @click="isUiUxExpanded = !isUiUxExpanded; activeView = 'folder-ui-ux'"
              class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <div class="flex items-center gap-2.5">
                <icon-lucide-folder class="size-4 text-red-300" />
                <span>UI & UX Design</span>
              </div>
              <icon-lucide-chevron-up class="size-3.5 text-zinc-500 transition-transform" :class="{ 'rotate-180': !isUiUxExpanded }" />
            </button>

            <!-- Nested Products Designs -->
            <div v-show="isUiUxExpanded" class="tree-branch-line ml-4 pl-4 pt-1 space-y-1">
              <div>
                <button
                  @click="isProductDesignsExpanded = !isProductDesignsExpanded"
                  class="w-full tree-branch-item flex items-center justify-between py-1.5 px-2.5 rounded-lg text-zinc-300 hover:text-white transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <icon-lucide-folder class="size-3.5 text-red-300" />
                    <span>Products Designs</span>
                  </div>
                  <icon-lucide-chevron-up class="size-3 text-zinc-500 transition-transform" :class="{ 'rotate-180': !isProductDesignsExpanded }" />
                </button>

                <!-- Sub-items under Products Designs -->
                <div
                  v-show="isProductDesignsExpanded"
                  class="tree-branch-line ml-4 pl-4 pt-1 space-y-1"
                >
                  <div
                    @click="activeView = 'projects'"
                    class="tree-branch-item py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Course Dashboard
                  </div>
                  <div
                    @click="activeView = 'projects'"
                    class="tree-branch-item py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    KDS Dashboard
                  </div>
                  <div
                    @click="activeView = 'projects'"
                    class="tree-branch-item flex items-center justify-between py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    <span class="flex items-center gap-1.5"><icon-lucide-folder class="size-3 text-red-300" />Drapora Projects</span>
                    <icon-lucide-chevron-right class="size-3 text-zinc-600" />
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
              <icon-lucide-folder class="size-4 text-red-300" />
              <span>Design Systems</span>
            </div>
            <icon-lucide-chevron-right class="size-3 text-zinc-600" />
          </div>

          <!-- 5. WEB APPS -->
          <div
            @click="activeView = 'folder-web-apps'"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <icon-lucide-folder class="size-4 text-red-300" />
              <span>Web Apps</span>
            </div>
            <icon-lucide-chevron-right class="size-3 text-zinc-600" />
          </div>

          <!-- + New Folder Button -->
          <div class="pt-2">
            <button
              @click="isNewFolderModalOpen = true"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10 text-xs transition-colors"
            >
              <span
                class="size-4 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center text-xs font-bold"
                >+</span
              >
              <span>New Folder</span>
            </button>
          </div>
        </div>

        <!-- ── ROCKET UPGRADE CARD (Dark Red / Ruby Gradient) ── -->
        <div
          v-if="guestTrial"
          class="my-6 p-4 rounded-2xl relative overflow-hidden bg-gradient-to-br from-rose-950/70 via-red-950/50 to-rose-950/70 border border-rose-500/20 shadow-xl"
        >
          <div class="flex items-start justify-between">
            <icon-lucide-rocket class="size-7 text-red-400 drop-shadow-[0_4px_12px_rgba(225,29,72,0.5)]" />
          </div>

          <div class="mt-2.5 space-y-1">
            <h4 class="text-xs font-bold text-white tracking-tight">Guest trial</h4>
            <p class="text-[10px] text-zinc-400 leading-relaxed">
              {{ guestTrial.remainingDays }} day{{ guestTrial.remainingDays === 1 ? '' : 's' }}
              remaining. Link an account to keep editing after the trial.
            </p>
          </div>

          <button
            @click="openProfileModal"
            class="w-full mt-3.5 py-2 px-3 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <icon-lucide-user-check class="size-3.5" />
            <span>Link & Manage Account</span>
          </button>
        </div>
      </div>

      <!-- User Profile at bottom (Dropup upwards to prevent bottom clipping) -->
      <div class="px-3 pb-4 pt-2 border-t border-white/5">
        <UserMenu direction="up" />
      </div>
    </aside>

    <!-- ════════ 3. MAIN DASHBOARD CONTENT AREA ════════ -->
    <div
      class="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-zinc-950/60 via-zinc-900/30 to-zinc-950/80"
    >
      <!-- Top Sticky Header -->
      <header
        class="glass-header h-[64px] flex items-center justify-between px-8 shrink-0 z-30 sticky top-0"
      >
        <!-- Storage Pill & Breadcrumbs -->
        <div class="flex items-center gap-6">
          <!-- Cloud Storage Indicator (Dark Red / Crimson Theme) -->
          <div
            class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs"
          >
            <icon-lucide-cloud class="size-4 text-red-400" />
            <div>
              <div
                class="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-300"
              >
                <span>Basic Storage</span>
                <span class="text-zinc-500">{{ formatBytes(totalStorageBytes) }} / 1 GB</span>
              </div>
              <div class="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div
                  class="h-full bg-gradient-to-r from-red-700 to-red-950 rounded-full"
                  :style="{ width: `${storageUsagePercent}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Breadcrumbs -->
          <div class="hidden lg:flex items-center gap-2 text-xs text-zinc-400">
            <button class="hover:text-white" type="button" @click="activeView = 'home'">Dashboard</button>
            <span>/</span>
            <span class="text-zinc-200 font-medium">Overview</span>
            <span>/</span>
            <span class="text-zinc-400">Recent Activity</span>
            <span class="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded"
              >{{ projects.length }}</span
            >
          </div>
        </div>

        <!-- Header Action Buttons (Dark Red Theme) -->
        <div class="flex items-center gap-3">
          <button
            @click="toggleTheme"
            type="button"
            class="theme-toggle size-9 rounded-xl glass-panel transition-all flex items-center justify-center"
            :aria-label="isLight ? 'Switch to dark mode' : 'Switch to light mode'"
            :title="isLight ? 'Switch to dark mode' : 'Switch to light mode'"
          >
            <icon-lucide-moon v-if="isLight" class="size-4" />
            <icon-lucide-sun v-else class="size-4" />
          </button>

          <button
            @click="handleImportClick"
            type="button"
            class="h-9 px-4 rounded-xl text-xs font-semibold text-zinc-300 glass-panel hover:text-white hover:border-rose-500/40 transition-all flex items-center gap-2"
          >
            <icon-lucide-download class="size-3.5" />
            <span>Import .fig</span>
          </button>

          <button
            @click="createNewDesign"
            type="button"
            class="dashboard-primary h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
          >
            <icon-lucide-plus class="size-3.5" />
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
            <button
              @click="activeView = 'recents'"
              class="text-xs text-rose-400 hover:text-rose-300"
            >
              View all
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="item in projects.slice(0, 4)"
              :key="item.id"
              @click="selectedProject = item"
              class="dashboard-project-card glass-card rounded-2xl p-4 cursor-pointer relative group transition-all duration-300"
              :class="
                selectedProject?.id === item.id ? 'ring-2 ring-rose-500/50 bg-rose-950/20' : ''
              "
            >
              <div class="flex items-start gap-3.5">
                <!-- Icon badge -->
                <div
                  class="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow"
                  :style="{
                    backgroundColor: getFileIcon(item.name).bg,
                    color: getFileIcon(item.name).color
                  }"
                >
                  {{ getFileIcon(item.name).label }}
                </div>

                <div class="min-w-0 flex-1">
                  <h4
                    class="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors"
                  >
                    {{ item.name }}
                  </h4>
                  <p class="text-[10px] text-zinc-400 mt-0.5">
                    Edited {{ formatTimeAgo(item.updatedAt) }}
                  </p>
                </div>

                <button @click.stop="openProject(item.id)" class="text-zinc-500 hover:text-white">
                  <icon-lucide-more-horizontal class="size-4" />
                </button>
              </div>

              <!-- Hover "See details" Pill button -->
              <div class="mt-4 flex items-center justify-end">
                <button
                  @click.stop="openProject(item.id)"
                  class="dashboard-secondary-action px-3 py-1 rounded-full text-[10px] font-bold text-white bg-zinc-900 border border-white/10 hover:bg-rose-600 hover:border-rose-500 transition-all"
                >
                  See details
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION: STITCH AI GLASS TEMPLATES ── -->
        <div class="space-y-4 pt-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-[10px] font-mono font-semibold text-red-300">
                Stitch Glass
              </span>
              <h2 class="text-sm font-bold text-white tracking-tight">AI Glass Templates</h2>
            </div>
            <span class="text-xs text-zinc-500">Google Stitch Design System</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="tpl in stitchTemplates"
              :key="tpl.id"
              class="dashboard-template-card relative rounded-2xl border border-white/10 bg-gradient-to-br p-4 overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-red-700/60 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_32px_rgba(127,29,29,0.24)]"
              :class="[tpl.gradient, tpl.border]"
              @click="createDesignFromTemplate(tpl.title)"
            >
              <!-- Ambient Inner Aurora Glow -->
              <div class="absolute -top-12 -right-12 size-32 rounded-full bg-red-900/30 blur-2xl group-hover:bg-red-800/40 transition-all duration-500 pointer-events-none" />

              <div class="relative z-10 flex flex-col justify-between h-36">
                <!-- Tag & Icon -->
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/80">
                    {{ tpl.tag }}
                  </span>
                  <div class="size-7 rounded-full bg-red-950/50 flex items-center justify-center text-red-300 group-hover:text-white group-hover:bg-red-800/60 transition-colors">
                    <icon-lucide-sparkles class="size-3.5" />
                  </div>
                </div>

                <!-- Title & Category -->
                <div>
                  <h3 class="text-sm font-bold text-white group-hover:text-red-300 transition-colors">
                    {{ tpl.title }}
                  </h3>
                  <p class="text-[11px] text-zinc-400 mt-0.5">{{ tpl.category }}</p>
                </div>

                <!-- Hover "Use template" Frosted Pill Action -->
                <div class="flex items-center justify-end">
                  <button
                    type="button"
                    @click.stop="createDesignFromTemplate(tpl.title)"
                    class="px-3 py-1 rounded-full text-[10px] font-bold text-black bg-white/90 hover:bg-white backdrop-blur-md shadow-md transition-all flex items-center gap-1 opacity-90 group-hover:opacity-100 group-hover:scale-105"
                  >
                    <span>Use template</span>
                    <icon-lucide-chevron-right class="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 2: SHARED FOLDERS (REALISTIC FOLDER SHAPE GEOMETRY) ── -->
        <div class="space-y-4 pt-2">
          <h2 class="text-sm font-bold text-white tracking-tight">Shared Folders</h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3">
            <div
              v-for="folder in dashboardFolders"
              :key="folder.id"
              class="relative pt-6 group cursor-pointer"
              role="button"
              tabindex="0"
              @click="activeFilterTab = 'shared-folders'; selectedDashboardFolderId = folder.id"
              @keydown.enter="activeFilterTab = 'shared-folders'; selectedDashboardFolderId = folder.id"
            >
              <!-- 1. Authentically Raised Folder Tab on Top-Left -->
              <div
                class="dashboard-folder-tab absolute top-0 left-0 h-7 px-4 rounded-t-xl flex items-center gap-2 border-t border-x border-white/10 z-10"
                :style="{ background: folder.tabBg }"
              >
                <!-- Folder Mini Icon -->
                <icon-lucide-folder class="size-3 text-red-100" />
                <span class="text-[11px] font-bold text-white truncate max-w-[100px]">{{
                  folder.name
                }}</span>
              </div>

              <!-- 2. Main Folder Sleeve Body (Cutout Under Tab) -->
              <div
                class="folder-realistic-card glass-card p-5 relative overflow-hidden group-hover:border-rose-500/50 shadow-2xl transition-all duration-300"
              >
                <!-- Inner Sleeve Drop Line -->
                <div class="absolute top-0 right-0 left-28 h-px bg-white/10" />

                <div class="flex flex-col justify-between h-full space-y-4 pt-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3
                        class="text-sm font-bold text-white group-hover:text-rose-300 transition-colors"
                      >
                        {{ folder.name }}
                      </h3>
                      <p class="text-[11px] text-zinc-400 mt-0.5">
                        {{ folder.fileCount }} files, {{ folder.size }}
                      </p>
                    </div>

                    <span
                      class="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded-full bg-zinc-900/80 border border-white/5"
                    >
                      {{ folder.size }}
                    </span>
                  </div>

                    <div class="flex items-center justify-between pt-3 border-t border-white/5">
                    <div class="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <icon-lucide-files class="size-3.5 text-red-400" />
                      <span>{{ folder.fileCount }} project{{ folder.fileCount === 1 ? '' : 's' }}</span>
                    </div>

                    <icon-lucide-arrow-right class="size-3.5 text-zinc-500 group-hover:text-red-400 transition-colors" />
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
                :class="
                  activeFilterTab === 'recents'
                    ? 'bg-zinc-900 text-white border border-white/10 shadow'
                    : 'text-zinc-400 hover:text-white'
                "
              >
                <icon-lucide-check v-if="activeFilterTab === 'recents'" class="size-3 text-red-400" />
                <span>Recently Opened</span>
              </button>

              <button
                @click="activeFilterTab = 'shared-docs'"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                :class="
                  activeFilterTab === 'shared-docs'
                    ? 'bg-zinc-900 text-white border border-white/10 shadow'
                    : 'text-zinc-400 hover:text-white'
                "
              >
                Shared Documents
              </button>

              <button
                @click="activeFilterTab = 'shared-folders'"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                :class="
                  activeFilterTab === 'shared-folders'
                    ? 'bg-zinc-900 text-white border border-white/10 shadow'
                    : 'text-zinc-400 hover:text-white'
                "
              >
                Shared Folders
              </button>
            </div>

            <!-- Search filter in list -->
            <div class="relative w-64">
              <icon-lucide-search class="size-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
                  <tr
                    class="dashboard-table-header border-b border-white/5 bg-zinc-950/60 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
                  >
                    <th class="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0"
                      />
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
                      <input
                        type="checkbox"
                        :checked="selectedProject?.id === project.id"
                        class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0"
                      />
                    </td>

                    <!-- File Name & Icon -->
                    <td class="py-3.5 px-4 font-semibold text-white">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow"
                          :style="{
                            backgroundColor: getFileIcon(project.name).bg,
                            color: getFileIcon(project.name).color
                          }"
                        >
                          {{ getFileIcon(project.name).label }}
                        </div>
                        <div>
                          <div
                            class="hover:text-rose-300 transition-colors"
                            @click="openProject(project.id)"
                          >
                            {{ project.name }}
                          </div>
                          <div
                            class="text-[10px] text-zinc-500 font-normal flex items-center gap-1.5"
                          >
                            <span class="flex items-center gap-1"><icon-lucide-users class="size-3" />{{ project.remoteId ? 'Shared' : 'Local' }}</span>
                            <span v-if="project.starred" class="text-red-400 flex items-center gap-1">• <icon-lucide-star class="size-3 fill-current" /> Starred</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Owner Avatars -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2 text-zinc-400">
                        <span class="size-6 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center">
                          <icon-lucide-user class="size-3" />
                        </span>
                        <span class="text-[11px]">{{ profileName }}</span>
                      </div>
                    </td>

                    <!-- Modified -->
                    <td class="py-3.5 px-4 text-zinc-400 text-[11px]">
                      {{ formatTimeAgo(project.updatedAt) }}
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 px-4 text-right" @click.stop>
                      <div class="flex items-center justify-end gap-1">
                        <button
                          @click="toggleStar(project)"
                          class="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-red-400"
                          :aria-label="project.starred ? 'Remove from starred' : 'Add to starred'"
                        >
                          <icon-lucide-star class="size-3.5" :class="{ 'fill-red-500 text-red-500': project.starred }" />
                        </button>
                        <button
                          @click="openProject(project.id)"
                          class="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white text-[10px] font-bold transition-all"
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredProjects.length === 0">
                    <td colspan="5" class="px-4 py-10 text-center text-zinc-500">
                      <div class="flex flex-col items-center gap-2">
                        <icon-lucide-folder-open class="size-5 text-red-400" />
                        <span v-if="activeFilterTab === 'shared-folders' && selectedDashboardFolderId?.startsWith('custom-')">This folder is ready for projects.</span>
                        <span v-else-if="activeFilterTab === 'shared-folders'">No projects in this folder.</span>
                        <span v-else-if="activeFilterTab === 'shared-docs'">No shared documents yet.</span>
                        <span v-else>No projects match this view.</span>
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
      <footer
        v-if="selectedProject"
        class="dashboard-footer h-12 border-t border-white/5 bg-zinc-950/90 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-30"
      >
        <div class="flex items-center gap-3 text-xs">
          <icon-lucide-palette class="size-4 text-red-400" />
          <span class="font-bold text-white">{{ selectedProject.name }}</span>
          <span class="text-zinc-500">•</span>
          <span class="text-zinc-400 text-[11px]">{{ formatBytes(selectedProject.document.byteLength) }}</span>
          <span class="text-zinc-500">•</span>
          <span class="text-zinc-400 text-[11px]">{{
            new Date(selectedProject.updatedAt).toLocaleDateString()
          }}</span>
        </div>

        <div class="flex items-center gap-3">
          <span
            class="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold flex items-center gap-1"
          >
            <icon-lucide-lock class="size-3" /> {{ selectedProject.remoteId ? 'Shared Project' : 'Local Project' }}
          </span>

          <button
            @click="openProject(selectedProject.id)"
            class="dashboard-primary px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Open Canvas</span>
            <icon-lucide-arrow-right class="size-3.5" />
          </button>
        </div>
      </footer>
    </div>

    <!-- Hidden Input for Importing .fig file -->
    <input type="file" ref="fileInput" accept=".fig" class="hidden" @change="handleImportFile" />

    <!-- Search Palette Dialog -->
    <div
      v-if="isSearchOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md"
      @click.self="isSearchOpen = false"
    >
      <div
        class="w-full max-w-lg glass-modal rounded-2xl overflow-hidden shadow-2xl animate-scale-up"
        @keydown="handleSearchKeyDown"
      >
        <div class="relative border-b border-white/[0.06]">
          <icon-lucide-search class="size-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchFilter"
            type="text"
            placeholder="Search projects, files, designs…"
            class="w-full h-14 pl-12 pr-4 bg-transparent text-[13px] text-white focus:outline-none placeholder-zinc-500"
            autofocus
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500"
            >ESC to close</span
          >
        </div>
        <div class="max-h-80 overflow-y-auto p-2">
          <div v-if="searchDialogMatches.length > 0">
            <div class="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Projects
            </div>
            <div
              v-for="(match, index) in searchDialogMatches"
              :key="match.id"
              class="px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              :class="
                index === selectedSearchIndex
                  ? 'bg-rose-600/20 text-white'
                  : 'text-zinc-400 hover:bg-white/[0.03]'
              "
              @mouseenter="selectedSearchIndex = index"
              @click="openProject(match.id)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-rose-400">📄</span>
                <span class="text-[12px] font-medium truncate">{{ match.name }}</span>
              </div>
              <span class="text-[9px] font-mono text-zinc-500 shrink-0"
                >Edited {{ formatTimeAgo(match.updatedAt) }}</span
              >
            </div>
          </div>
          <div v-else class="py-10 text-center text-[12px] text-zinc-500">
            No results for "{{ searchFilter }}"
          </div>
        </div>
      </div>
    </div>

    <!-- New Folder Dialog Modal -->
    <div
      v-if="isNewFolderModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      @click.self="isNewFolderModalOpen = false"
    >
      <div
        class="w-full max-w-sm glass-modal rounded-2xl p-6 shadow-2xl animate-scale-up space-y-4"
      >
        <h3 class="text-sm font-bold text-white">Create New Folder</h3>
        <div>
          <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1"
            >Folder Name</label
          >
          <input
            v-model="newFolderName"
            type="text"
            placeholder="e.g. Mobile Design Kit"
            class="glass-input h-9 px-3.5 rounded-xl text-[12px] text-white w-full"
          />
        </div>
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button
            @click="isNewFolderModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            @click="createFolder"
            :disabled="!newFolderName.trim()"
            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Workspace Settings Modal -->
    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      @click.self="isSettingsOpen = false"
    >
      <div class="w-full max-w-sm glass-modal rounded-2xl p-6 shadow-2xl animate-scale-up">
        <h3 class="text-sm font-bold text-white mb-5">Workspace Settings</h3>
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
              >Display Name</label
            >
            <input
              v-model="profileName"
              type="text"
              class="glass-input h-9 px-3.5 rounded-xl text-[12px] text-white w-full"
            />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2.5 mt-6">
          <button
            @click="isSettingsOpen = false"
            type="button"
            class="h-9 px-4 rounded-xl glass-panel text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveProfileName"
            type="button"
            class="h-9 px-4 rounded-xl text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500"
          >
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
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
