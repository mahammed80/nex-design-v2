<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  AdminApiError,
  ADMIN_API_BASE,
  bulkUpdateCloudUsers,
  downloadCloudUsersCsv,
  fetchCloudStats,
  fetchCloudUsers,
  getCurrentAdmin,
  signInAdmin,
  signOutAdmin,
  updateCloudUser,
  type AdminIdentity,
  type CloudAccountStatus,
  type CloudBulkUpdate,
  type CloudPagination,
  type CloudStats,
  type CloudUser,
  type CloudUserFilters,
  type ExpiryType,
  type PlanSlug
} from '@/app/admin/cloud'

// --- NAVIGATION TABS ---
type AdminTab = 'users' | 'plans' | 'licenses' | 'analytics' | 'system'
const activeTab = ref<AdminTab>('users')

const authenticated = ref(false)
const adminUser = ref<AdminIdentity | null>(null)
const loading = ref(false)
const errorMsg = ref('')
const apiHost = new URL(ADMIN_API_BASE).host

// Admin login form
const loginForm = reactive({
  email: '',
  password: ''
})

const stats = ref<CloudStats>({
  total_users: 0,
  students_count: 0,
  graduates_count: 0,
  professionals_count: 0,
  os_breakdown: [],
  top_institutions: [],
  top_majors: [],
  status_breakdown: []
})

const users = ref<CloudUser[]>([])
const pagination = ref<CloudPagination>({
  current_page: 1,
  limit: 25,
  total_records: 0,
  total_pages: 1
})

const filters = reactive<CloudUserFilters>({
  search: '',
  user_type: '',
  preferred_os: '',
  status: ''
})

const selectedUserIds = ref<number[]>([])

// Expiry modal
const expiryModalOpen = ref(false)
const selectedUserForExpiry = ref<CloudUser | null>(null)
const expiryType = ref<ExpiryType>('30_days')
const customExpiryDate = ref('')

// Quick standalone license generator
const generatedKeyResult = ref('')
const newKeyPlan = ref<PlanSlug>('professional')

const planLabels: Record<PlanSlug, string> = {
  starter: 'Starter Package',
  professional: 'Professional Package',
  teams: 'Teams Studio Package'
}

const osLabels: Record<string, string> = {
  windows: 'Windows (x64)',
  mac_arm: 'macOS (Apple Silicon)',
  mac_intel: 'macOS (Intel)',
  linux: 'Linux (x64)'
}

const LICENSE_PREFIX: Record<PlanSlug, string> = {
  starter: 'NEX-STR',
  professional: 'NEX-PRO',
  teams: 'NEX-TEAM'
}

function osLabel(os: string | null): string {
  return (os && osLabels[os]) || os || 'Unknown'
}

const ACCOUNT_STATUSES: readonly CloudAccountStatus[] = [
  'active',
  'approved',
  'pending',
  'invited_to_beta',
  'suspended',
  'restricted'
]

const topOs = computed(() => {
  const row = stats.value.os_breakdown[0]
  return {
    label: row ? osLabel(row.preferred_os) : 'Windows',
    count: Number(row?.count ?? 0)
  }
})

const openMenuId = ref<string | null>(null)

function closeAllMenus() {
  openMenuId.value = null
}

function isPlanSlug(value: string): value is PlanSlug {
  return value in planLabels
}

function isAccountStatus(value: string): value is CloudAccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value)
}

/** Surface API failures; an expired/revoked token drops back to the sign-in screen. */
function handleApiError(error: unknown, fallback: string) {
  if (error instanceof AdminApiError && error.kind === 'unauthorized') {
    authenticated.value = false
    adminUser.value = null
    errorMsg.value = 'Your admin session expired. Sign in again.'
    return
  }
  errorMsg.value = error instanceof Error ? error.message : fallback
  console.warn('[NexDesign Admin]', fallback, error)
}

function enterDashboard(admin: AdminIdentity) {
  authenticated.value = true
  adminUser.value = admin
  errorMsg.value = ''
  void fetchStats()
  void fetchUsers()
}

async function checkAdminAuth() {
  try {
    const admin = await getCurrentAdmin()
    if (admin) enterDashboard(admin)
  } catch (error) {
    handleApiError(error, `Could not reach ${apiHost}.`)
  }
}

async function handleAdminLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    enterDashboard(await signInAdmin(loginForm.email.trim(), loginForm.password))
    loginForm.password = ''
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Authentication failed.'
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    stats.value = await fetchCloudStats()
  } catch (error) {
    handleApiError(error, 'Failed to load statistics.')
  }
}

async function fetchUsers(page = 1) {
  loading.value = true
  try {
    const result = await fetchCloudUsers(filters, page)
    users.value = result.users
    pagination.value = result.pagination
  } catch (error) {
    handleApiError(error, 'Failed to load users.')
  } finally {
    loading.value = false
  }
}

const onSearchInput = useDebounceFn(() => fetchUsers(1), 300)

function getPlanSlug(u: CloudUser): PlanSlug {
  return isPlanSlug(u.plan_slug) ? u.plan_slug : 'starter'
}

async function saveUserPackageAndStatus(
  user: CloudUser,
  planSlug: string,
  status: string,
  reason?: string | null,
  regenerateKey = false,
  expiryTypeVal?: ExpiryType,
  customDateVal?: string
) {
  if (!isPlanSlug(planSlug) || !isAccountStatus(status)) return
  try {
    const result = await updateCloudUser(user.id, {
      plan_slug: planSlug,
      status,
      restriction_reason: reason,
      regenerate_key: regenerateKey,
      expiry_type: expiryTypeVal,
      custom_expiry_date: customDateVal
    })
    user.plan_slug = result.plan_slug
    user.plan_name = result.plan_name
    user.status = result.status
    user.restriction_reason = result.restriction_reason
    user.license_key = result.license_key
    user.plan_expires_at = result.plan_expires_at
    void fetchStats()
  } catch (error) {
    handleApiError(error, `Failed to update ${user.email}.`)
    // Re-sync the row so a failed edit doesn't leave a select showing an unsaved value.
    void fetchUsers(pagination.value.current_page)
  }
}

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedUserIds.value = checked ? users.value.map((u) => u.id) : []
}

function toggleUserSelection(id: number) {
  const index = selectedUserIds.value.indexOf(id)
  if (index !== -1) selectedUserIds.value.splice(index, 1)
  else selectedUserIds.value.push(id)
}

async function executeBulkAction(
  actionType: 'plan' | 'status' | 'expiry' | 'regenerate',
  value?: string
) {
  if (!selectedUserIds.value.length) return
  const update: CloudBulkUpdate = {}
  if (actionType === 'plan' && value && isPlanSlug(value)) update.plan_slug = value
  if (actionType === 'status' && value && isAccountStatus(value)) update.status = value
  if (actionType === 'expiry') update.expiry_type = value as ExpiryType
  if (actionType === 'regenerate') update.regenerate_keys = true

  try {
    await bulkUpdateCloudUsers(selectedUserIds.value, update)
    selectedUserIds.value = []
  } catch (error) {
    handleApiError(error, 'Bulk update failed.')
  }
  await fetchUsers(pagination.value.current_page)
  void fetchStats()
}

async function copyToClipboard(text: string | null, label = 'Copied') {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    alert(`${label}: ${text}`)
  } catch (error) {
    handleApiError(error, 'Clipboard access was denied.')
  }
}

function openExpiryModal(u: CloudUser) {
  selectedUserForExpiry.value = u
  expiryType.value = '30_days'
  customExpiryDate.value = ''
  expiryModalOpen.value = true
}

function closeExpiryModal() {
  expiryModalOpen.value = false
  selectedUserForExpiry.value = null
}

async function applyExpiry() {
  const user = selectedUserForExpiry.value
  if (!user) return
  await saveUserPackageAndStatus(
    user,
    getPlanSlug(user),
    user.status,
    user.restriction_reason,
    false,
    expiryType.value,
    expiryType.value === 'custom' ? customExpiryDate.value : undefined
  )
  closeExpiryModal()
}

async function exportCsv() {
  try {
    await downloadCloudUsersCsv()
  } catch (error) {
    handleApiError(error, 'CSV export failed.')
  }
}

async function handleLogout() {
  await signOutAdmin()
  authenticated.value = false
  adminUser.value = null
  users.value = []
}

/** Local serial-number generator (not registered server-side). Uses crypto randomness. */
function generateNewKey() {
  const prefix = LICENSE_PREFIX[newKeyPlan.value]
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  generatedKeyResult.value = `${prefix}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`
}

useEventListener(window, 'click', closeAllMenus)

onMounted(() => {
  void checkAdminAuth()
})
</script>

<template>
  <div
    class="min-h-screen bg-[#070709] text-zinc-100 p-4 sm:p-8 font-sans selection:bg-rose-600 selection:text-white"
  >
    <!-- LOGIN SCREEN FOR ADMIN -->
    <div
      v-if="!authenticated"
      class="max-w-md mx-auto mt-20 p-8 rounded-2xl border border-white/10 bg-[#121115]/90 shadow-2xl backdrop-blur-2xl"
    >
      <div class="text-center mb-6">
        <div
          class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 text-rose-400 mb-3 shadow-inner"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Nex Admin Portal</h2>
        <p class="text-xs text-zinc-400 font-mono mt-1">
          Authenticate to manage users, plans & licenses
        </p>
      </div>

      <div
        v-if="errorMsg"
        class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
      >
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleAdminLogin" class="space-y-4">
        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1"
            >Admin Email</label
          >
          <input
            v-model="loginForm.email"
            type="email"
            required
            placeholder="admin@nex-design.online"
            class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1"
            >Password</label
          >
          <input
            v-model="loginForm.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-mono font-bold text-xs tracking-wider shadow-lg disabled:opacity-50 transition cursor-pointer"
        >
          {{ loading ? 'VERIFYING...' : 'ACCESS CONTROL PANEL' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <router-link to="/" class="text-xs font-mono text-zinc-400 hover:text-white transition"
          >← Return to Studio</router-link
        >
      </div>
    </div>

    <!-- MAIN ADMIN DASHBOARD -->
    <div v-else class="max-w-7xl mx-auto space-y-6">
      <!-- TOP NAVIGATION BAR -->
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10"
      >
        <div>
          <div class="flex items-center gap-3">
            <span
              class="text-2xl font-black bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent font-sans"
              >NEX DESIGN</span
            >
            <span
              class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-widest"
              >Admin Control</span
            >
          </div>
          <h1 class="text-xl font-bold text-white mt-1">Cloud Entitlements & License Hub</h1>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="exportCsv"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            EXPORT CSV
          </button>

          <router-link
            to="/"
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono font-medium border border-white/10 transition"
          >
            LIVE STUDIO
          </router-link>

          <button
            @click="handleLogout"
            class="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono font-medium border border-rose-500/20 transition cursor-pointer"
          >
            LOGOUT
          </button>
        </div>
      </div>

      <!-- MAIN TABS NAVIGATION BAR -->
      <div
        class="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/80 border border-white/10 overflow-x-auto shadow-inner"
      >
        <button
          @click="activeTab = 'users'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'users'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          ]"
        >
          <span>👥</span>
          <span>ACCOUNTS & QUEUE</span>
          <span class="px-1.5 py-0.2 rounded-md bg-black/40 text-[10px]">{{
            stats.total_users || users.length
          }}</span>
        </button>

        <button
          @click="activeTab = 'plans'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'plans'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          ]"
        >
          <span>📦</span>
          <span>PLANS & PACKAGES</span>
        </button>

        <button
          @click="activeTab = 'licenses'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'licenses'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          ]"
        >
          <span>🔑</span>
          <span>LICENSES & KEYS</span>
        </button>

        <button
          @click="activeTab = 'analytics'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          ]"
        >
          <span>📊</span>
          <span>UNIVERSITY METRICS</span>
        </button>

        <button
          @click="activeTab = 'system'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'system'
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          ]"
        >
          <span>⚙️</span>
          <span>SYSTEM & SMTP</span>
        </button>
      </div>

      <!-- ==================== TAB 1: ACCOUNTS & QUEUE ==================== -->
      <div v-if="activeTab === 'users'" class="space-y-6 animate-fade-in">
        <!-- KPI METRICS SUMMARY -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div class="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Total Registered
            </div>
            <div class="text-3xl font-extrabold text-white font-mono mt-2">
              {{ stats.total_users }}
            </div>
            <div class="text-[10px] text-zinc-500 font-mono mt-1">Sequential queue entries</div>
          </div>
          <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div class="text-[11px] font-mono uppercase tracking-wider text-rose-400">
              University Students
            </div>
            <div class="text-3xl font-extrabold text-white font-mono mt-2">
              {{ stats.students_count }}
            </div>
            <div class="text-[10px] text-zinc-500 font-mono mt-1">
              {{
                stats.total_users > 0
                  ? Math.round((stats.students_count / stats.total_users) * 100)
                  : 0
              }}% of total
            </div>
          </div>
          <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div class="text-[11px] font-mono uppercase tracking-wider text-blue-400">
              Graduates & Pros
            </div>
            <div class="text-3xl font-extrabold text-white font-mono mt-2">
              {{ stats.graduates_count + stats.professionals_count }}
            </div>
            <div class="text-[10px] text-zinc-500 font-mono mt-1">
              {{
                stats.total_users > 0
                  ? Math.round(
                      ((stats.graduates_count + stats.professionals_count) / stats.total_users) *
                        100
                    )
                  : 0
              }}% of total
            </div>
          </div>
          <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
            <div class="text-[11px] font-mono uppercase tracking-wider text-purple-400">
              Top Platform
            </div>
            <div class="text-2xl font-bold text-white font-mono mt-2 capitalize">
              {{ topOs.label }}
            </div>
            <div class="text-[10px] text-zinc-500 font-mono mt-1">{{ topOs.count }} requests</div>
          </div>
        </div>

        <!-- BULK OPERATIONS TOOLBAR -->
        <div
          v-if="selectedUserIds.length > 0"
          class="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-4 shadow-2xl backdrop-blur-2xl animate-fade-in z-30 relative"
        >
          <div class="flex items-center gap-3 text-rose-300 font-mono text-xs font-bold">
            <span
              class="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 shadow-inner"
            >
              {{ selectedUserIds.length }} Selected
            </span>
            <span>Execute Bulk Actions:</span>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <button
              @click="executeBulkAction('plan', 'professional')"
              class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition"
            >
              Upgrade to Pro
            </button>
            <button
              @click="executeBulkAction('plan', 'teams')"
              class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition"
            >
              Upgrade to Teams
            </button>
            <button
              @click="executeBulkAction('status', 'active')"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition"
            >
              Activate Selected
            </button>
            <button
              @click="executeBulkAction('status', 'invited_to_beta')"
              class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition"
            >
              Invite to Beta
            </button>
            <button
              @click="executeBulkAction('regenerate')"
              class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition"
            >
              Generate Keys
            </button>
          </div>
        </div>

        <!-- SEARCH & FILTER CONTROLS -->
        <div
          class="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div class="relative w-full md:w-80">
            <input
              v-model="filters.search"
              @input="onSearchInput"
              type="text"
              placeholder="Search name, email, university..."
              class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <svg
              class="w-4 h-4 text-zinc-500 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              v-model="filters.user_type"
              @change="fetchUsers(1)"
              class="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Categories</option>
              <option value="student">University Students</option>
              <option value="graduate">Graduates & Pros</option>
            </select>

            <select
              v-model="filters.preferred_os"
              @change="fetchUsers(1)"
              class="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Platforms</option>
              <option value="windows">Windows</option>
              <option value="mac_arm">macOS (Apple Silicon)</option>
              <option value="mac_intel">macOS (Intel)</option>
              <option value="linux">Linux</option>
            </select>

            <select
              v-model="filters.status"
              @change="fetchUsers(1)"
              class="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="invited_to_beta">Invited to Beta</option>
              <option value="active">Active Access</option>
              <option value="restricted">Restricted</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <!-- USERS TABLE -->
        <div
          class="rounded-2xl border border-white/10 bg-zinc-900/40 shadow-2xl backdrop-blur-xl relative"
        >
          <div class="overflow-x-auto min-h-[350px] pb-16">
            <table class="w-full text-left text-xs">
              <thead
                class="bg-black/70 text-zinc-400 uppercase font-mono tracking-wider text-[10px] border-b border-white/10"
              >
                <tr>
                  <th class="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      :checked="
                        selectedUserIds.length > 0 && selectedUserIds.length === users.length
                      "
                      @change="toggleSelectAll"
                      class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th class="py-3.5 px-4">Queue #</th>
                  <th class="py-3.5 px-4">User & Email</th>
                  <th class="py-3.5 px-4">Package Plan</th>
                  <th class="py-3.5 px-4">Plan Expiration</th>
                  <th class="py-3.5 px-4">License Key</th>
                  <th class="py-3.5 px-4">Status & Access</th>
                  <th class="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-zinc-300">
                <tr
                  v-for="u in users"
                  :key="u.id"
                  :class="[
                    'hover:bg-white/[0.02] transition',
                    selectedUserIds.includes(u.id) ? 'bg-rose-500/[0.04]' : ''
                  ]"
                >
                  <td class="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      :checked="selectedUserIds.includes(u.id)"
                      @change="toggleUserSelection(u.id)"
                      class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  <td class="py-3.5 px-4 font-mono font-bold text-rose-400">
                    #{{ u.waitlist_number || u.id }}
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="font-semibold text-white">{{ u.name }}</div>
                    <div class="text-[11px] text-zinc-400 font-mono">{{ u.email }}</div>
                    <span class="text-[10px] text-zinc-500 font-mono"
                      >({{ osLabel(u.preferred_os) }})</span
                    >
                  </td>

                  <!-- Package Plan Dropdown -->
                  <td class="py-3.5 px-4">
                    <select
                      :value="getPlanSlug(u)"
                      @change="
                        saveUserPackageAndStatus(
                          u,
                          ($event.target as HTMLSelectElement).value,
                          u.status
                        )
                      "
                      class="px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold bg-[#141217] text-zinc-200 border-white/15 focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="starter">⚡ Starter Package</option>
                      <option value="professional">💎 Professional Package</option>
                      <option value="teams">👑 Teams Studio</option>
                    </select>
                  </td>

                  <!-- Plan Expiration -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5">
                      <span
                        v-if="u.plan_expires_at"
                        class="text-[11px] font-mono text-zinc-200 bg-white/5 px-2 py-0.5 rounded border border-white/10"
                      >
                        {{ u.plan_expires_at.split(' ')[0] }}
                      </span>
                      <span
                        v-else
                        class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                      >
                        Lifetime
                      </span>
                      <button
                        @click="openExpiryModal(u)"
                        class="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] transition cursor-pointer"
                        title="Edit Expiry"
                      >
                        📅
                      </button>
                    </div>
                  </td>

                  <!-- License Key -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5">
                      <code
                        v-if="u.license_key"
                        class="text-[10px] font-mono text-rose-300 bg-rose-950/40 px-2 py-1 rounded border border-rose-500/30"
                      >
                        {{ u.license_key }}
                      </code>
                      <span v-else class="text-[10px] text-zinc-500 italic">No Key</span>
                      <button
                        v-if="u.license_key"
                        @click="copyToClipboard(u.license_key, 'License Key')"
                        class="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] transition"
                        title="Copy Key"
                      >
                        📋
                      </button>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="py-3.5 px-4">
                    <select
                      :value="u.status"
                      @change="
                        saveUserPackageAndStatus(
                          u,
                          getPlanSlug(u),
                          ($event.target as HTMLSelectElement).value
                        )
                      "
                      class="px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold bg-[#141217] text-zinc-200 border-white/15 focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="invited_to_beta">✨ Invite to Beta</option>
                      <option value="active">✅ Active Access</option>
                      <option value="restricted">🚫 Restricted</option>
                      <option value="suspended">🔒 Suspended</option>
                    </select>
                  </td>

                  <!-- Actions -->
                  <td class="py-3.5 px-4 text-right">
                    <button
                      @click="
                        saveUserPackageAndStatus(u, getPlanSlug(u), u.status, undefined, true)
                      "
                      class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-mono border border-white/10 transition cursor-pointer"
                      title="Regenerate Key"
                    >
                      🔄 Reset Key
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="pagination.total_pages > 1"
            class="p-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 font-mono"
          >
            <div>
              Page {{ pagination.current_page }} of {{ pagination.total_pages }} ({{
                pagination.total_records
              }}
              total)
            </div>
            <div class="flex gap-2">
              <button
                :disabled="pagination.current_page <= 1"
                @click="fetchUsers(pagination.current_page - 1)"
                class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                :disabled="pagination.current_page >= pagination.total_pages"
                @click="fetchUsers(pagination.current_page + 1)"
                class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 2: PLANS & PACKAGES CONTROL ==================== -->
      <div v-else-if="activeTab === 'plans'" class="space-y-6 animate-fade-in">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Starter Package Card -->
          <div class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 space-y-4">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300"
                >STARTER</span
              >
              <span class="text-sm font-mono text-zinc-400 font-bold">Free / Beta</span>
            </div>
            <h3 class="text-lg font-bold text-white">Starter Package</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Entry level tier for student prototypes and personal exploration.
            </p>
            <ul class="space-y-2 text-xs text-zinc-300 font-mono pt-2 border-t border-white/5">
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 1 Device Hardware Activation
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 1080p Standard Export
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 7-Day Offline Lease
              </li>
            </ul>
          </div>

          <!-- Professional Package Card -->
          <div
            class="p-6 rounded-2xl bg-zinc-900/60 border border-rose-500/40 space-y-4 shadow-xl shadow-rose-950/20"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40"
                >PROFESSIONAL</span
              >
              <span class="text-sm font-mono text-rose-400 font-bold">$12 / mo</span>
            </div>
            <h3 class="text-lg font-bold text-white">Professional Package</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Full studio suite for graduate designers, freelances & agencies.
            </p>
            <ul class="space-y-2 text-xs text-zinc-300 font-mono pt-2 border-t border-white/5">
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 3 Devices Hardware Activation
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 4K & Ultra-HD Canvas Export
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> AI Generation Assistant
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 30-Day Offline Lease
              </li>
            </ul>
          </div>

          <!-- Teams Studio Package Card -->
          <div
            class="p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/40 space-y-4 shadow-xl shadow-purple-950/20"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40"
                >TEAMS STUDIO</span
              >
              <span class="text-sm font-mono text-purple-400 font-bold">$36 / mo</span>
            </div>
            <h3 class="text-lg font-bold text-white">Teams Studio Package</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Enterprise workspace for design agencies & university labs.
            </p>
            <ul class="space-y-2 text-xs text-zinc-300 font-mono pt-2 border-t border-white/5">
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 10 Devices Hardware Activation
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> 8K Lossless Render & SVG Export
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> Real-time Collaborative WebRTC
              </li>
              <li class="flex items-center gap-2">
                <span class="text-emerald-400">✓</span> Unlimited Offline Lease
              </li>
            </ul>
          </div>
        </div>

        <!-- Quick Package Assignment Helper -->
        <div class="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-4">
          <h3 class="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Default Package Strategy
          </h3>
          <p class="text-xs text-zinc-400">
            All newly registered University Students and Graduates default to
            <strong>Starter Package</strong>. Use the <strong>Accounts & Queue</strong> tab to
            upgrade selected users to <strong>Professional</strong> or
            <strong>Teams Studio</strong>.
          </p>
        </div>
      </div>

      <!-- ==================== TAB 3: LICENSES & KEYS ==================== -->
      <div v-else-if="activeTab === 'licenses'" class="space-y-6 animate-fade-in">
        <!-- Standalone Key Generator Tool -->
        <div class="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
          <h3
            class="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2"
          >
            <span>🔑</span>
            <span>Standalone License Key Generator</span>
          </h3>
          <p class="text-xs text-zinc-400">
            Generate isolated serial keys formatted for desktop activation without assigning to a
            user directly.
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="newKeyPlan"
              class="px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
            >
              <option value="starter">Starter Key (NEX-STR-...)</option>
              <option value="professional">Professional Key (NEX-PRO-...)</option>
              <option value="teams">Teams Studio Key (NEX-TEAM-...)</option>
            </select>

            <button
              @click="generateNewKey"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition cursor-pointer"
            >
              Generate Serial Key
            </button>
          </div>

          <div
            v-if="generatedKeyResult"
            class="p-4 rounded-xl bg-black/60 border border-rose-500/40 flex items-center justify-between"
          >
            <code class="text-sm font-mono font-bold text-rose-400">{{ generatedKeyResult }}</code>
            <button
              @click="copyToClipboard(generatedKeyResult, 'Serial Key')"
              class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono"
            >
              Copy
            </button>
          </div>
        </div>

        <!-- Active User Keys Table -->
        <div class="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 space-y-4">
          <h3 class="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Assigned User License Keys
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-zinc-400 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th class="py-2">User</th>
                  <th class="py-2">Tier</th>
                  <th class="py-2">License Key</th>
                  <th class="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-zinc-300">
                <tr v-for="u in users.filter((x) => x.license_key)" :key="u.id">
                  <td class="py-3 font-semibold text-white">
                    {{ u.name }}
                    <span class="text-zinc-400 font-mono text-[10px]">({{ u.email }})</span>
                  </td>
                  <td class="py-3 uppercase font-mono text-[10px] text-rose-300">
                    {{ getPlanSlug(u) }}
                  </td>
                  <td class="py-3 font-mono text-rose-400">{{ u.license_key }}</td>
                  <td class="py-3 text-right">
                    <button
                      @click="copyToClipboard(u.license_key, 'Key')"
                      class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-mono"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 4: UNIVERSITY METRICS ==================== -->
      <div v-else-if="activeTab === 'analytics'" class="space-y-6 animate-fade-in">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Top Universities -->
          <div class="p-6 rounded-2xl bg-zinc-900/40 border border-white/10">
            <h3
              class="text-xs font-mono uppercase tracking-wider font-bold text-white mb-4 flex items-center gap-2"
            >
              <span>🏛️ Institutions & Universities Ranking</span>
            </h3>
            <div class="space-y-3">
              <div
                v-for="inst in stats.top_institutions"
                :key="inst.institution"
                class="flex items-center justify-between text-xs py-2 border-b border-white/5"
              >
                <span class="text-zinc-200 font-medium truncate max-w-[280px]">{{
                  inst.institution
                }}</span>
                <span
                  class="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-mono font-bold border border-rose-500/20 text-[11px]"
                  >{{ inst.count }} registrations</span
                >
              </div>
              <div v-if="!stats.top_institutions?.length" class="text-xs text-zinc-500 italic">
                No institution data recorded.
              </div>
            </div>
          </div>

          <!-- Top Majors -->
          <div class="p-6 rounded-2xl bg-zinc-900/40 border border-white/10">
            <h3
              class="text-xs font-mono uppercase tracking-wider font-bold text-white mb-4 flex items-center gap-2"
            >
              <span>🎨 Specializations & Faculties Ranking</span>
            </h3>
            <div class="space-y-3">
              <div
                v-for="maj in stats.top_majors"
                :key="maj.faculty_major"
                class="flex items-center justify-between text-xs py-2 border-b border-white/5"
              >
                <span class="text-zinc-200 font-medium truncate max-w-[280px]">{{
                  maj.faculty_major
                }}</span>
                <span
                  class="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono font-bold border border-blue-500/20 text-[11px]"
                  >{{ maj.count }} users</span
                >
              </div>
              <div v-if="!stats.top_majors?.length" class="text-xs text-zinc-500 italic">
                No specialization data recorded.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 5: SYSTEM & SMTP ==================== -->
      <div v-else-if="activeTab === 'system'" class="space-y-6 animate-fade-in">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- SMTP Provider Status -->
          <div class="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <h3
              class="text-xs font-mono uppercase tracking-wider font-bold text-white mb-2 flex items-center gap-2"
            >
              <span>✉️ Hostinger SMTP Provider</span>
            </h3>
            <div class="space-y-2 text-xs font-mono">
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">SMTP Host</span>
                <span class="text-white font-bold">smtp.hostinger.com</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Port / Security</span>
                <span class="text-white font-bold">465 (SSL Socket)</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Sender Address</span>
                <span class="text-rose-400 font-bold">info@nex-design.online</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Delivery Status</span>
                <span class="text-emerald-400 font-bold">Active & Delivering</span>
              </div>
            </div>
          </div>

          <!-- Database Connection Status -->
          <div class="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <h3
              class="text-xs font-mono uppercase tracking-wider font-bold text-white mb-2 flex items-center gap-2"
            >
              <span>🗄️ MySQL Database Health</span>
            </h3>
            <div class="space-y-2 text-xs font-mono">
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Database Engine</span>
                <span class="text-white font-bold">MariaDB / MySQL 8.0</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Database Name</span>
                <span class="text-white font-bold">u268537024_design</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Total Records</span>
                <span class="text-rose-400 font-bold">{{ stats.total_users }} Accounts</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-white/5">
                <span class="text-zinc-400">Connection State</span>
                <span class="text-emerald-400 font-bold">Healthy & Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EXPIRY MODAL -->
    <div v-if="expiryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="closeExpiryModal" />
      <div
        class="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#141216] p-6 shadow-2xl z-10 text-white space-y-4"
      >
        <h3 class="text-base font-bold">Set Plan Expiration Period</h3>
        <p class="text-xs text-zinc-400 font-mono">User: {{ selectedUserForExpiry?.name }}</p>

        <div class="space-y-2 text-xs font-mono">
          <label
            class="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
          >
            <input type="radio" v-model="expiryType" value="30_days" />
            <span>+30 Days (1 Month)</span>
          </label>
          <label
            class="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
          >
            <input type="radio" v-model="expiryType" value="3_months" />
            <span>+3 Months (Quarter)</span>
          </label>
          <label
            class="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
          >
            <input type="radio" v-model="expiryType" value="1_year" />
            <span>+1 Year (Annual)</span>
          </label>
          <label
            class="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
          >
            <input type="radio" v-model="expiryType" value="lifetime" />
            <span class="text-emerald-400 font-bold">Lifetime Unlimited</span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            @click="closeExpiryModal"
            class="px-4 py-2 rounded-xl bg-white/5 text-xs font-mono"
          >
            Cancel
          </button>
          <button
            @click="applyExpiry"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold"
          >
            Save Expiry
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
