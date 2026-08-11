<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { readFigFile, exportFigFile } from '@nex-design/core/io/formats/fig'
import { createEditorStore } from '@/app/editor/session'
import { createDemoShapes } from '@/app/demo/document'
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
const activeView = ref<'home' | 'recents' | 'starred' | 'projects'>('home')
const searchQuery = ref('')
const sortBy = ref<'modified' | 'created' | 'name'>('modified')
const viewMode = ref<'grid' | 'list'>('grid')
const activeAccount = ref(localStorage.getItem('nex-design:active-account') || localStorage.getItem('nex-design:user-name') || 'Mohamed')
const accounts = ref<string[]>(JSON.parse(localStorage.getItem('nex-design:accounts') || '[]'))

if (accounts.value.length === 0) {
  accounts.value = [activeAccount.value]
  localStorage.setItem('nex-design:accounts', JSON.stringify(accounts.value))
}
localStorage.setItem('nex-design:active-account', activeAccount.value)

const profileName = ref(activeAccount.value)
const isSettingsOpen = ref(false)
const isSearchOpen = ref(false)
const searchFilter = ref('')
const selectedSearchIndex = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)

// Add Account Dialog state
const isAddAccountOpen = ref(false)
const newAccountName = ref('')

function switchAccount(name: string) {
  activeAccount.value = name
  profileName.value = name
  localStorage.setItem('nex-design:active-account', name)
  localStorage.setItem('nex-design:user-name', name)
}

function openAddAccount() {
  newAccountName.value = ''
  isAddAccountOpen.value = true
}

function addAccount() {
  const name = newAccountName.value.trim()
  if (!name) return
  if (!accounts.value.includes(name)) {
    accounts.value.push(name)
    localStorage.setItem('nex-design:accounts', JSON.stringify(accounts.value))
  }
  isAddAccountOpen.value = false
  switchAccount(name)
}

function signOut() {
  localStorage.removeItem('nex-design:active-account')
  localStorage.removeItem('nex-design:user-name')
  router.push('/landing')
}

// Project records
const projects = ref<ProjectRecord[]>([])
const loading = ref(true)

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
  } catch (err) {
    console.error('Failed to load projects:', err)
  } finally {
    loading.value = false
  }
}

// Seed the default demo project
async function seedDemoProject(db: IDBDatabase) {
  // Create a transient editor store
  const store = createEditorStore()
  createDemoShapes(store)
  
  // Export binary document
  const docBytes = await exportFigFile(store.graph)
  
  // Render thumbnail
  let thumbnail = ''
  try {
    const renderData = await store.renderExportImage([], 0.5, 'PNG')
    if (renderData) {
      thumbnail = uint8ArrayToBase64(renderData)
    }
  } catch (e) {
    console.warn('Failed to render demo thumbnail', e)
  }
  
  // Save to DB
  await createProjectInDb(db, {
    id: 'demo-project-id',
    name: 'SaaS Dashboard (Demo)',
    document: docBytes,
    thumbnail,
    starred: true,
    createdAt: Date.now() - 3600000 * 2, // 2 hours ago
    updatedAt: Date.now() - 3600000 * 2
  })
  
  store.dispose()
}

// Filtered and sorted projects for the current active view
const filteredProjects = computed(() => {
  let list = [...projects.value]

  // Filter based on active view tab
  if (activeView.value === 'starred') {
    list = list.filter((p) => p.starred)
  } else if (activeView.value === 'recents') {
    // Sorted by updatedAt desc in recents
    list.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  // Filter by search query if any
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(query))
  }

  // Sorting
  if (activeView.value !== 'recents') {
    list.sort((a, b) => {
      if (sortBy.value === 'modified') return b.updatedAt - a.updatedAt
      if (sortBy.value === 'created') return b.createdAt - a.createdAt
      if (sortBy.value === 'name') return a.name.localeCompare(b.name)
      return 0
    })
  }

  return list
})

// Recents grouping for the dedicated Recents page
const groupedRecents = computed(() => {
  const sorted = [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)
  const now = Date.now()
  const today: ProjectRecord[] = []
  const yesterday: ProjectRecord[] = []
  const earlier: ProjectRecord[] = []

  for (const p of sorted) {
    const diff = now - p.updatedAt
    if (diff < 24 * 3600 * 1000) {
      today.push(p)
    } else if (diff < 48 * 3600 * 1000) {
      yesterday.push(p)
    } else {
      earlier.push(p)
    }
  }

  return { today, yesterday, earlier }
})

// Starred projects list
const starredProjects = computed(() => projects.value.filter((p) => p.starred))

// Search dialog filter list
const searchDialogMatches = computed(() => {
  const query = searchFilter.value.trim().toLowerCase()
  if (!query) return projects.value.slice(0, 5) // Show recent 5 if empty
  return projects.value.filter((p) => p.name.toLowerCase().includes(query))
})

// Database CRUD Actions
async function createNewDesign() {
  const db = await openDb()
  const store = createEditorStore()
  // Add some starting canvas defaults
  store.graph.addPage('Page 1')
  const docBytes = await exportFigFile(store.graph)
  
  const id = crypto.randomUUID()
  const newProject: ProjectRecord = {
    id,
    name: 'Untitled',
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

async function renameProject(project: ProjectRecord) {
  const newName = prompt('Rename Project:', project.name)
  if (newName === null || !newName.trim()) return
  try {
    const db = await openDb()
    await updateProjectInDb(db, project.id, { name: newName.trim(), updatedAt: Date.now() })
    await loadProjects()
  } catch (err) {
    console.error('Failed to rename project:', err)
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

// User Settings Settings
function saveProfileName() {
  const oldName = activeAccount.value
  const newName = profileName.value.trim()
  if (!newName) return
  
  const idx = accounts.value.indexOf(oldName)
  if (idx !== -1) {
    accounts.value[idx] = newName
  } else {
    accounts.value.push(newName)
  }
  
  activeAccount.value = newName
  localStorage.setItem('nex-design:active-account', newName)
  localStorage.setItem('nex-design:user-name', newName)
  localStorage.setItem('nex-design:accounts', JSON.stringify(accounts.value))
  isSettingsOpen.value = false
}

// Import Design File
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
      name,
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

// Command palette search trigger
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
  // Command + K or Ctrl + K opens Search
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    openSearchPalette()
  }
})

// Time formatter
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

onMounted(() => {
  loadProjects()
})
</script>

<template>
<div class="flex h-screen w-screen bg-[#09090b] text-[#eae8e4] overflow-hidden font-sans">
    <!-- Sidebar Navigation -->
    <aside class="w-64 border-r border-white/5 bg-[#0e0e11] flex flex-col justify-between shrink-0 select-none">
      <div class="flex flex-col py-6">
        <!-- Logo -->
        <div class="px-6 mb-8 select-none">
          <img src="/logo.png" class="h-8 w-auto invert object-contain opacity-90 hover:opacity-100 transition-opacity" alt="Nexx Design" />
        </div>

        <!-- Navigation Links -->
        <nav class="px-3 space-y-1">
          <button
            @click="activeView = 'home'"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
            :class="[activeView === 'home' ? 'bg-white/5 text-[#fafafa] font-semibold' : 'text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa]']"
          >
            <icon-lucide-home class="size-4 shrink-0" />
            Home
          </button>
          <button
            @click="activeView = 'recents'"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
            :class="[activeView === 'recents' ? 'bg-white/5 text-[#fafafa] font-semibold' : 'text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa]']"
          >
            <icon-lucide-history class="size-4 shrink-0" />
            Recents
          </button>
          <button
            @click="activeView = 'starred'"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
            :class="[activeView === 'starred' ? 'bg-white/5 text-[#fafafa] font-semibold' : 'text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa]']"
          >
            <icon-lucide-star class="size-4 shrink-0" />
            Starred
          </button>
          <button
            @click="activeView = 'projects'"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
            :class="[activeView === 'projects' ? 'bg-white/5 text-[#fafafa] font-semibold' : 'text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa]']"
          >
            <icon-lucide-folder class="size-4 shrink-0" />
            Projects
          </button>
        </nav>

        <!-- Divider -->
        <div class="h-px bg-white/5 my-6 mx-4" />

        <!-- Subheading -->
        <div class="px-6 text-[10px] font-semibold text-[#52525b] uppercase tracking-widest mb-3">Workspace</div>
        <div class="px-3">
          <button
            @click="activeView = 'projects'"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-accent" />
            My Projects
          </button>
        </div>
      </div>

      <!-- Bottom Settings/Help Links -->
      <div class="p-3 space-y-1">
        <button
          @click="isSettingsOpen = true"
          type="button"
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
        >
          <icon-lucide-settings class="size-4" />
          Settings
        </button>
        <a
          href="https://github.com/mahammed80/nex-design-v2"
          target="_blank"
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
        >
          <icon-lucide-help-circle class="size-4" />
          Help
        </a>

        <!-- Account Control Section -->
        <div class="border-t border-white/5 pt-3 mt-3 px-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <!-- Avatar -->
              <div class="w-7 h-7 rounded-full bg-accent/20 border border-accent/35 flex items-center justify-center font-bold text-accent text-xs shrink-0 uppercase select-none">
                {{ activeAccount[0] }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold text-[#fafafa] truncate leading-tight">{{ activeAccount }}</div>
                <div class="text-[9px] text-[#71717a] leading-none">Active Profile</div>
              </div>
            </div>
            
            <!-- Dropdown Action Trigger -->
            <div class="relative group/account">
              <button
                type="button"
                class="size-6 rounded hover:bg-white/5 text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors"
              >
                <icon-lucide-more-vertical class="size-3.5" />
              </button>
              <!-- Dropdown Menu -->
              <div class="absolute bottom-full left-0 mb-1.5 w-44 rounded-lg border border-white/5 bg-[#121215] p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/account:opacity-100 group-hover/account:translate-y-0 group-hover/account:pointer-events-auto transition-all duration-150 z-50 before:absolute before:inset-x-0 before:h-2 before:top-full">
                <div class="px-2 py-1 text-[9px] font-semibold text-[#52525b] uppercase tracking-wider border-b border-white/5 mb-1">Accounts</div>
                <!-- List Accounts -->
                <button
                  v-for="acc in accounts.filter(a => a !== activeAccount)"
                  :key="acc"
                  @click="switchAccount(acc)"
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded text-[11px] text-[#a1a1aa] hover:bg-white/5 hover:text-white transition-colors truncate flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-[#52525b]" />
                  {{ acc }}
                </button>
                <button
                  @click="openAddAccount"
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded text-[11px] text-accent hover:bg-accent/10 transition-colors flex items-center gap-1.5"
                >
                  <icon-lucide-plus class="size-3" />
                  Add Account
                </button>
                <button
                  @click="signOut"
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded text-[11px] text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5 mt-1 pt-1.5 flex items-center gap-1.5"
                >
                  <icon-lucide-log-out class="size-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Workspace Dashboard Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top Sticky Header -->
      <header class="h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
        <div class="flex items-center select-none">
          <img src="/logo.png" class="h-6 w-auto invert object-contain" alt="Nexx Design" />
        </div>

        <!-- Global Search trigger bar -->
        <div
          @click="openSearchPalette"
          class="w-96 h-9 rounded-lg border border-white/5 bg-[#121215] flex items-center px-3 gap-2.5 cursor-pointer text-[#71717a] hover:border-white/10 transition-colors select-none"
        >
          <icon-lucide-search class="size-4" />
          <span class="text-xs">Search projects, files, designs...</span>
          <span class="ml-auto text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Ctrl K</span>
        </div>

        <!-- + New Button Dropdown wrapper -->
        <div class="relative group">
          <button
            @click="createNewDesign"
            type="button"
            class="h-9 px-4 rounded-lg bg-accent hover:bg-accent/80 text-white font-bold text-xs tracking-wide transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-violet-600/10 active:scale-[0.98]"
          >
            <icon-lucide-plus class="size-3.5" />
            New Design
          </button>
          
          <!-- Dropdown container -->
          <div class="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-white/5 bg-[#18181b] p-1.5 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-150 z-50 before:absolute before:inset-x-0 before:h-2 before:bottom-full">
            <button
              @click="createNewDesign"
              type="button"
              class="w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-0.5"
            >
              <span class="text-xs font-bold text-[#fafafa] flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-accent" />
                🎨 Design
              </span>
              <span class="text-[10px] text-[#71717a]">Create a new design canvas</span>
            </button>
            <button
              @click="handleImportClick"
              type="button"
              class="w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-0.5"
            >
              <span class="text-xs font-bold text-[#fafafa] flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-accent" />
                📄 Import
              </span>
              <span class="text-[10px] text-[#71717a]">Import an existing .fig file</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Dashboard view switcher -->
      <div class="p-8 max-w-7xl mx-auto w-full flex-1">
        <!-- ── HOME VIEW ── -->
        <div v-if="activeView === 'home'" class="space-y-10 animate-fade-in">
          <!-- Welcome Section -->
          <div class="flex flex-col gap-1.5">
            <h2 class="text-3xl font-extrabold tracking-tight text-[#fafafa]">
              Good morning, {{ profileName }} 👋
            </h2>
            <p class="text-sm text-[#a1a1aa] font-light">What do you want to create today?</p>
          </div>

          <!-- Quick Actions Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              @click="createNewDesign"
              class="group/card rounded-2xl border border-white/5 bg-[#121215] p-6 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 cursor-pointer flex flex-col gap-4 shadow-sm"
            >
              <div class="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent group-hover/card:scale-105 transition-transform">
                <icon-lucide-plus class="size-5" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-[#fafafa] mb-1">New Design</h3>
                <p class="text-xs text-[#a1a1aa] leading-relaxed">Start with a blank canvas and design anything you can imagine.</p>
              </div>
            </div>

            <div
              @click="handleImportClick"
              class="group/card rounded-2xl border border-white/5 bg-[#121215] p-6 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 cursor-pointer flex flex-col gap-4 shadow-sm"
            >
              <div class="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent group-hover/card:scale-105 transition-transform">
                <icon-lucide-external-link class="size-4.5" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-[#fafafa] mb-1">Import File</h3>
                <p class="text-xs text-[#a1a1aa] leading-relaxed">Import and open a local Figma .fig design file directly on Nexx.</p>
              </div>
            </div>

            <div
              @click="createNewDesign"
              class="group/card rounded-2xl border border-white/5 bg-[#121215] p-6 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 cursor-pointer flex flex-col gap-4 shadow-sm"
            >
              <div class="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent group-hover/card:scale-105 transition-transform">
                <icon-lucide-grid class="size-4.5" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-[#fafafa] mb-1">Use Template</h3>
                <p class="text-xs text-[#a1a1aa] leading-relaxed">Jumpstart your workflow with SaaS, dashboard, or landing page templates.</p>
              </div>
            </div>
          </div>

          <!-- Recent Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-[#fafafa]">Recent Files</h3>
              <button @click="activeView = 'recents'" type="button" class="text-xs text-accent hover:text-accent/80 transition-colors">See all</button>
            </div>
            
            <div v-if="projects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div
                v-for="project in projects.slice(0, 4)"
                :key="project.id"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300"
              >
                <!-- Thumbnail Area -->
                <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer select-none group/thumb border-b border-white/5">
                  <img
                    v-if="project.thumbnail"
                    :src="project.thumbnail"
                    alt="Design Preview"
                    class="w-full h-full object-cover group-hover/thumb:scale-[1.02] transition-transform duration-500"
                  />
                  <div v-else class="text-[10px] font-mono text-[#52525b]">No Preview</div>

                  <!-- Quick Action Actions trigger button on card hover -->
                  <div class="absolute right-2 top-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 flex gap-1">
                    <button
                      @click.stop="toggleStar(project)"
                      type="button"
                      class="size-7 rounded bg-[#18181b]/90 border border-white/5 flex items-center justify-center hover:bg-[#27272a] hover:text-[#fafafa] text-[#a1a1aa] transition-colors"
                      :title="project.starred ? 'Unstar project' : 'Star project'"
                    >
                      <icon-lucide-star class="size-3.5" :class="{ 'fill-amber-500 text-amber-500': project.starred }" />
                    </button>
                    
                    <!-- Actions Dropdown -->
                    <div class="relative group/menu">
                      <button
                        type="button"
                        class="size-7 rounded bg-[#18181b]/90 border border-white/5 flex items-center justify-center hover:bg-[#27272a] hover:text-[#fafafa] text-[#a1a1aa] transition-colors"
                      >
                        <icon-lucide-ellipsis class="size-3.5" />
                      </button>
                      <div class="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/5 bg-[#1c1c21] p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-150">
                        <button @click.stop="openProject(project.id)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-external-link class="size-3" /> Open</button>
                        <button @click.stop="renameProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-pencil class="size-3" /> Rename</button>
                        <button @click.stop="duplicateProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-copy class="size-3" /> Duplicate</button>
                        <button @click.stop="deleteProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-rose-400 flex items-center gap-1.5"><icon-lucide-trash-2 class="size-3" /> Delete</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Info footer -->
                <div class="p-3.5 flex flex-col gap-0.5">
                  <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                  <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                </div>
              </div>
            </div>
            
            <div v-else class="rounded-2xl border border-dashed border-white/5 p-12 text-center flex flex-col items-center justify-center gap-4">
              <div class="size-10 rounded-full bg-white/5 flex items-center justify-center text-[#71717a]"><icon-lucide-history class="size-5" /></div>
              <div>
                <h4 class="text-sm font-semibold text-[#fafafa] mb-1">No recent files</h4>
                <p class="text-xs text-[#71717a]">Your recently opened designs will appear here.</p>
              </div>
            </div>
          </div>

          <!-- My Projects grid view -->
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 class="text-base font-bold text-[#fafafa]">My Projects</h3>
              <div class="flex items-center gap-3">
                <!-- Sort Dropdown -->
                <div class="relative group/sort">
                  <button type="button" class="px-2.5 py-1.5 rounded-lg border border-white/5 bg-[#121215] text-[11px] text-[#a1a1aa] flex items-center gap-1 hover:text-white transition-colors">
                    Sort: {{ sortBy === 'modified' ? 'Last modified' : sortBy === 'created' ? 'Created' : 'Name' }}
                    <icon-lucide-chevron-down class="size-3 text-muted" />
                  </button>
                  <div class="absolute right-0 top-full mt-1 w-32 rounded-lg border border-white/5 bg-[#1c1c21] p-1 shadow-lg opacity-0 translate-y-1 pointer-events-none group-hover/sort:opacity-100 group-hover/sort:translate-y-0 group-hover/sort:pointer-events-auto transition-all duration-150 z-25">
                    <button @click="sortBy = 'modified'" type="button" class="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-[11px]" :class="{ 'text-violet-400': sortBy === 'modified' }">Last modified</button>
                    <button @click="sortBy = 'created'" type="button" class="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-[11px]" :class="{ 'text-violet-400': sortBy === 'created' }">Created</button>
                    <button @click="sortBy = 'name'" type="button" class="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-[11px]" :class="{ 'text-violet-400': sortBy === 'name' }">Name</button>
                  </div>
                </div>

                <!-- View Mode Grid/List toggle buttons -->
                <div class="flex items-center gap-1 bg-[#121215] border border-white/5 p-1 rounded-lg">
                  <button @click="viewMode = 'grid'" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white" :class="{ 'bg-white/5 text-[#fafafa]': viewMode === 'grid' }"><icon-lucide-grid class="size-3.5" /></button>
                  <button @click="viewMode = 'list'" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white" :class="{ 'bg-white/5 text-[#fafafa]': viewMode === 'list' }"><icon-lucide-list class="size-3.5" /></button>
                </div>
              </div>
            </div>

            <!-- Grid Display -->
            <div v-if="filteredProjects.length > 0 && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div
                v-for="project in filteredProjects"
                :key="project.id"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300"
              >
                <!-- Thumbnail -->
                <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer select-none group/thumb border-b border-white/5">
                  <img
                    v-if="project.thumbnail"
                    :src="project.thumbnail"
                    alt="Design Preview"
                    class="w-full h-full object-cover group-hover/thumb:scale-[1.02] transition-transform duration-500"
                  />
                  <div v-else class="text-[10px] font-mono text-[#52525b]">No Preview</div>

                  <!-- Quick Actions -->
                  <div class="absolute right-2 top-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 flex gap-1">
                    <button
                      @click.stop="toggleStar(project)"
                      type="button"
                      class="size-7 rounded bg-[#18181b]/90 border border-white/5 flex items-center justify-center hover:bg-[#27272a] hover:text-[#fafafa] text-[#a1a1aa] transition-colors"
                    >
                      <icon-lucide-star class="size-3.5" :class="{ 'fill-amber-500 text-amber-500': project.starred }" />
                    </button>
                    
                    <div class="relative group/menu">
                      <button type="button" class="size-7 rounded bg-[#18181b]/90 border border-white/5 flex items-center justify-center hover:bg-[#27272a] hover:text-[#fafafa] text-[#a1a1aa] transition-colors">
                        <icon-lucide-ellipsis class="size-3.5" />
                      </button>
                      <div class="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/5 bg-[#1c1c21] p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-150">
                        <button @click.stop="openProject(project.id)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-external-link class="size-3" /> Open</button>
                        <button @click.stop="renameProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-pencil class="size-3" /> Rename</button>
                        <button @click.stop="duplicateProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-copy class="size-3" /> Duplicate</button>
                        <button @click.stop="deleteProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-rose-400 flex items-center gap-1.5"><icon-lucide-trash-2 class="size-3" /> Delete</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Info footer -->
                <div class="p-3.5 flex flex-col gap-0.5">
                  <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                  <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- List Display -->
            <div v-else-if="filteredProjects.length > 0 && viewMode === 'list'" class="border border-white/5 rounded-xl bg-[#121215] overflow-hidden divide-y divide-white/5">
              <div
                v-for="project in filteredProjects"
                :key="project.id"
                class="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors group/item cursor-pointer"
                @click="openProject(project.id)"
              >
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-10 h-7 rounded border border-white/5 bg-[#1d1d22] flex items-center justify-center shrink-0 overflow-hidden">
                    <img v-if="project.thumbnail" :src="project.thumbnail" alt="Thumbnail" class="w-full h-full object-cover" />
                    <icon-lucide-image v-else class="size-3.5 text-muted" />
                  </div>
                  <span class="text-xs font-bold text-[#fafafa] truncate">{{ project.name }}</span>
                </div>

                <div class="flex items-center gap-6 text-[10px] text-[#71717a] shrink-0" @click.stop>
                  <span>Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                  
                  <div class="flex items-center gap-1.5">
                    <button
                      @click.stop="toggleStar(project)"
                      type="button"
                      class="p-1 rounded hover:bg-white/5 text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                    >
                      <icon-lucide-star class="size-3.5" :class="{ 'fill-amber-500 text-amber-500': project.starred }" />
                    </button>
                    
                    <div class="relative group/menu">
                      <button type="button" class="p-1 rounded hover:bg-white/5 text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
                        <icon-lucide-ellipsis class="size-3.5" />
                      </button>
                      <div class="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/5 bg-[#1c1c21] p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-150 z-30">
                        <button @click.stop="openProject(project.id)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-external-link class="size-3" /> Open</button>
                        <button @click.stop="renameProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-pencil class="size-3" /> Rename</button>
                        <button @click.stop="duplicateProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-[#eae8e4] flex items-center gap-1.5"><icon-lucide-copy class="size-3" /> Duplicate</button>
                        <button @click.stop="deleteProject(project)" type="button" class="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-rose-400 flex items-center gap-1.5"><icon-lucide-trash-2 class="size-3" /> Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Projects state -->
            <div v-else class="rounded-2xl border border-dashed border-white/5 p-16 text-center flex flex-col items-center justify-center gap-4">
              <div class="size-10 rounded-full bg-white/5 flex items-center justify-center text-[#71717a]"><icon-lucide-folder class="size-5" /></div>
              <div>
                <h4 class="text-sm font-semibold text-[#fafafa] mb-1">Create your first design</h4>
                <p class="text-xs text-[#71717a] mb-4">Start building something amazing on Nexx Design.</p>
                <button
                  @click="createNewDesign"
                  type="button"
                  class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 font-bold text-xs tracking-wide text-white transition-colors"
                >
                  Create design
                </button>
              </div>
            </div>
          </div>

          <!-- Templates list Section -->
          <div class="space-y-4 pt-4 border-t border-white/5">
            <h3 class="text-base font-bold text-[#fafafa]">Templates Library</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div
                @click="createNewDesign"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-[1.8] bg-[#1d1c1a] border-b border-white/5 flex items-center justify-center text-[10px] font-mono text-[#52525b]">
                  SaaS Dashboard
                </div>
                <div class="p-3">
                  <h4 class="text-xs font-semibold text-[#fafafa] truncate">SaaS Dashboard</h4>
                  <span class="text-[9px] text-[#71717a]">Start with standard components</span>
                </div>
              </div>

              <div
                @click="createNewDesign"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-[1.8] bg-[#1c1c1f] border-b border-white/5 flex items-center justify-center text-[10px] font-mono text-[#52525b]">
                  Landing Page
                </div>
                <div class="p-3">
                  <h4 class="text-xs font-semibold text-[#fafafa] truncate">Landing Page</h4>
                  <span class="text-[9px] text-[#71717a]">Start with pricing and CTA sections</span>
                </div>
              </div>

              <div
                @click="createNewDesign"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-[1.8] bg-[#1a1a1f] border-b border-white/5 flex items-center justify-center text-[10px] font-mono text-[#52525b]">
                  Mobile App Mockup
                </div>
                <div class="p-3">
                  <h4 class="text-xs font-semibold text-[#fafafa] truncate">Mobile App Screen</h4>
                  <span class="text-[9px] text-[#71717a]">Mobile layout and UI modules</span>
                </div>
              </div>

              <div
                @click="createNewDesign"
                class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-[1.8] bg-[#1a1c1d] border-b border-white/5 flex items-center justify-center text-[10px] font-mono text-[#52525b]">
                  Admin Template
                </div>
                <div class="p-3">
                  <h4 class="text-xs font-semibold text-[#fafafa] truncate">Admin Portal</h4>
                  <span class="text-[9px] text-[#71717a]">Side-nav layout and tabular records</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── RECENTS VIEW ── -->
        <div v-else-if="activeView === 'recents'" class="space-y-8 animate-fade-in">
          <div>
            <h2 class="text-2xl font-extrabold text-[#fafafa] mb-1">Recents</h2>
            <p class="text-xs text-[#a1a1aa]">Your recently opened and edited designs</p>
          </div>

          <div v-if="projects.length > 0" class="space-y-8">
            <!-- Today Group -->
            <div v-if="groupedRecents.today.length > 0" class="space-y-4">
              <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wider">Today</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div v-for="project in groupedRecents.today" :key="project.id" class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300">
                  <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5">
                    <img v-if="project.thumbnail" :src="project.thumbnail" alt="Preview" class="w-full h-full object-cover" />
                    <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
                  </div>
                  <div class="p-3 flex items-center justify-between">
                    <div>
                      <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                      <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Yesterday Group -->
            <div v-if="groupedRecents.yesterday.length > 0" class="space-y-4">
              <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wider">Yesterday</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div v-for="project in groupedRecents.yesterday" :key="project.id" class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300">
                  <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5">
                    <img v-if="project.thumbnail" :src="project.thumbnail" alt="Preview" class="w-full h-full object-cover" />
                    <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
                  </div>
                  <div class="p-3 flex items-center justify-between">
                    <div>
                      <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                      <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Earlier Group -->
            <div v-if="groupedRecents.earlier.length > 0" class="space-y-4">
              <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wider">Earlier</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div v-for="project in groupedRecents.earlier" :key="project.id" class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300">
                  <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5">
                    <img v-if="project.thumbnail" :src="project.thumbnail" alt="Preview" class="w-full h-full object-cover" />
                    <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
                  </div>
                  <div class="p-3 flex items-center justify-between">
                    <div>
                      <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                      <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-white/5 p-16 text-center flex flex-col items-center justify-center gap-4">
            <div class="size-10 rounded-full bg-white/5 flex items-center justify-center text-[#71717a]"><icon-lucide-history class="size-5" /></div>
            <div>
              <h4 class="text-sm font-semibold text-[#fafafa] mb-1">No recent files</h4>
              <p class="text-xs text-[#71717a]">Your recently opened designs will appear here.</p>
            </div>
          </div>
        </div>

        <!-- ── STARRED VIEW ── -->
        <div v-else-if="activeView === 'starred'" class="space-y-8 animate-fade-in">
          <div>
            <h2 class="text-2xl font-extrabold text-[#fafafa] mb-1">Starred</h2>
            <p class="text-xs text-[#a1a1aa]">Your starred designs for quick access</p>
          </div>

          <div v-if="starredProjects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div
              v-for="project in starredProjects"
              :key="project.id"
              class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300"
            >
              <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5">
                <img v-if="project.thumbnail" :src="project.thumbnail" alt="Preview" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
              </div>
              <div class="p-3 flex items-center justify-between">
                <div>
                  <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                  <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                </div>
                <button @click="toggleStar(project)" type="button" class="p-1 rounded text-amber-500 hover:bg-white/5 transition-colors">
                  <icon-lucide-star class="size-4 fill-amber-500" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty Starred state -->
          <div v-else class="rounded-2xl border border-dashed border-white/5 p-16 text-center flex flex-col items-center justify-center gap-4">
            <div class="size-10 rounded-full bg-white/5 flex items-center justify-center text-[#71717a]"><icon-lucide-star class="size-5" /></div>
            <div>
              <h4 class="text-sm font-semibold text-[#fafafa] mb-1">No starred projects</h4>
              <p class="text-xs text-[#71717a]">Star important projects to find them quickly here.</p>
            </div>
          </div>
        </div>

        <!-- ── PROJECTS VIEW ── -->
        <div v-else-if="activeView === 'projects'" class="space-y-6 animate-fade-in">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-extrabold text-[#fafafa] mb-1">Projects</h2>
              <p class="text-xs text-[#a1a1aa]">Browse, search and manage all designs</p>
            </div>
            <button
              @click="createNewDesign"
              type="button"
              class="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs tracking-wide transition-colors"
            >
              + New Design
            </button>
          </div>

          <!-- Filter Search Toolbar -->
          <div class="flex items-center gap-3">
            <div class="relative flex-1 max-w-md">
              <icon-lucide-search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71717a]" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search projects..."
                class="w-full h-9 pl-9 pr-4 rounded-lg border border-white/5 bg-[#121215] text-xs text-[#eae8e4] focus:outline-none focus:border-white/10 transition-colors"
              />
            </div>

            <!-- List/Grid Toggle -->
            <div class="flex items-center gap-1 bg-[#121215] border border-white/5 p-1 rounded-lg ml-auto">
              <button @click="viewMode = 'grid'" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white" :class="{ 'bg-white/5 text-[#fafafa]': viewMode === 'grid' }"><icon-lucide-grid class="size-3.5" /></button>
              <button @click="viewMode = 'list'" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white" :class="{ 'bg-white/5 text-[#fafafa]': viewMode === 'list' }"><icon-lucide-list class="size-3.5" /></button>
            </div>
          </div>

          <!-- Project Display Grid -->
          <div v-if="filteredProjects.length > 0 && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300"
            >
              <div @dblclick="openProject(project.id)" class="aspect-[1.6] bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5">
                <img v-if="project.thumbnail" :src="project.thumbnail" alt="Preview" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
              </div>
              <div class="p-3 flex items-center justify-between">
                <div>
                  <h4 @click="openProject(project.id)" class="text-xs font-bold text-[#fafafa] truncate cursor-pointer hover:text-white">{{ project.name }}</h4>
                  <span class="text-[10px] text-[#71717a]">Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                </div>
                
                <div class="flex items-center gap-1">
                  <button @click="toggleStar(project)" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
                    <icon-lucide-star class="size-3.5" :class="{ 'fill-amber-500 text-amber-500': project.starred }" />
                  </button>
                  <button @click="deleteProject(project)" type="button" class="p-1 rounded text-[#a1a1aa] hover:text-rose-400 transition-colors">
                    <icon-lucide-trash-2 class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Display List -->
          <div v-else-if="filteredProjects.length > 0 && viewMode === 'list'" class="border border-white/5 rounded-xl bg-[#121215] overflow-hidden divide-y divide-white/5">
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
              @click="openProject(project.id)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-7 rounded border border-white/5 bg-[#1d1d22] flex items-center justify-center overflow-hidden shrink-0">
                  <img v-if="project.thumbnail" :src="project.thumbnail" alt="Thumbnail" class="w-full h-full object-cover" />
                  <icon-lucide-image v-else class="size-3.5 text-muted" />
                </div>
                <span class="text-xs font-bold text-[#fafafa] truncate">{{ project.name }}</span>
              </div>
              <div class="flex items-center gap-6 text-[10px] text-[#71717a]" @click.stop>
                <span>Edited {{ formatTimeAgo(project.updatedAt) }}</span>
                <button @click="toggleStar(project)" type="button" class="p-1 rounded hover:bg-white/5 transition-colors">
                  <icon-lucide-star class="size-3.5" :class="{ 'fill-amber-500 text-amber-500': project.starred }" />
                </button>
                <button @click="deleteProject(project)" type="button" class="p-1 rounded hover:bg-white/5 text-rose-400 transition-colors">
                  <icon-lucide-trash-2 class="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty list state -->
          <div v-else class="rounded-2xl border border-dashed border-white/5 p-16 text-center flex flex-col items-center justify-center gap-4">
            <div class="size-10 rounded-full bg-white/5 flex items-center justify-center text-[#71717a]"><icon-lucide-folder class="size-5" /></div>
            <div>
              <h4 class="text-sm font-semibold text-[#fafafa] mb-1">No designs found</h4>
              <p class="text-xs text-[#71717a]">Try adjusting your search query or create a new design.</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Hidden Input for Importing .fig file -->
    <input
      type="file"
      ref="fileInput"
      accept=".fig"
      class="hidden"
      @change="handleImportFile"
    />

    <!-- Settings Dialog / Profile Panel modal -->
    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="isSettingsOpen = false"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/5 bg-[#18181b] p-6 shadow-2xl animate-scale-up">
        <h3 class="text-base font-bold text-[#fafafa] mb-4">Workspace Settings</h3>
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Your Name</label>
            <input
              v-model="profileName"
              type="text"
              class="h-9 px-3 rounded-lg border border-white/5 bg-[#121215] text-xs text-[#eae8e4] focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 mt-6">
          <button
            @click="isSettingsOpen = false"
            type="button"
            class="h-9 px-4 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            @click="saveProfileName"
            type="button"
            class="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
    <!-- Add Account Dialog -->
    <div
      v-if="isAddAccountOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="isAddAccountOpen = false"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/5 bg-[#18181b] p-6 shadow-2xl animate-scale-up">
        <h3 class="text-base font-bold text-[#fafafa] mb-4">Add Account</h3>
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Account Name</label>
            <input
              v-model="newAccountName"
              type="text"
              placeholder="e.g. Sarah"
              class="h-9 px-3 rounded-lg border border-white/5 bg-[#121215] text-xs text-[#eae8e4] focus:outline-none focus:border-accent"
              @keydown.enter="addAccount"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 mt-6">
          <button
            @click="isAddAccountOpen = false"
            type="button"
            class="h-9 px-4 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            @click="addAccount"
            type="button"
            class="h-9 px-4 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-bold transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Command palette dialog search modal overlay -->
    <div
      v-if="isSearchOpen"
      class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 bg-black/60 backdrop-blur-sm"
      @click.self="isSearchOpen = false"
    >
      <div class="w-full max-w-lg rounded-2xl border border-white/5 bg-[#18181b] overflow-hidden shadow-2xl animate-scale-up" @keydown="handleSearchKeyDown">
        <!-- Search Input -->
        <div class="relative border-b border-white/5">
          <icon-lucide-search class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#71717a]" />
          <input
            v-model="searchFilter"
            type="text"
            placeholder="Search projects, files, designs..."
            class="w-full h-12 pl-12 pr-4 bg-transparent text-xs text-[#fafafa] focus:outline-none placeholder-[#71717a]"
            autofocus
          />
        </div>

        <!-- Matches dropdown -->
        <div class="max-h-72 overflow-y-auto p-1.5">
          <div v-if="searchDialogMatches.length > 0">
            <div class="px-3 py-2 text-[9px] font-bold text-[#71717a] uppercase tracking-wider select-none">Projects</div>
            
            <div
              v-for="(match, index) in searchDialogMatches"
              :key="match.id"
              class="p-2.5 rounded-lg flex items-center justify-between cursor-pointer select-none transition-colors"
              :class="[index === selectedSearchIndex ? 'bg-white/5 text-white' : 'text-[#a1a1aa] hover:bg-white/[0.01] hover:text-[#eae8e4]']"
              @mouseenter="selectedSearchIndex = index"
              @click="openProject(match.id)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <icon-lucide-file class="size-4 shrink-0 text-violet-400" />
                <span class="text-xs truncate font-medium">{{ match.name }}</span>
              </div>
              <span class="text-[9px] font-mono opacity-50 shrink-0">Edited {{ formatTimeAgo(match.updatedAt) }}</span>
            </div>
          </div>

          <div v-else class="py-8 text-center text-xs text-[#71717a] select-none">
            No projects match "{{ searchFilter }}"
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}
.animate-scale-up {
  animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
</style>
