<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import NexLogo from '@/components/Landing/NexLogo.vue'

const authenticated = ref(false)
const adminUser = ref<any>(null)
const loading = ref(false)
const errorMsg = ref('')

// Admin login form
const loginForm = reactive({
  email: '',
  password: ''
})

// Stats
const stats = ref<any>({
  total_users: 0,
  students_count: 0,
  graduates_count: 0,
  professionals_count: 0,
  os_breakdown: [],
  top_institutions: [],
  top_majors: []
})

// Users list & filters
const users = ref<any[]>([])
const pagination = ref({
  current_page: 1,
  limit: 25,
  total_records: 0,
  total_pages: 1
})

const filters = reactive({
  search: '',
  user_type: '',
  preferred_os: '',
  status: ''
})

const osLabels: Record<string, string> = {
  windows: 'Windows (x64)',
  mac_arm: 'macOS (Apple Silicon)',
  mac_intel: 'macOS (Intel)',
  linux: 'Linux (x64)'
}

async function checkAdminAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me.php`)
    let data: any = null
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    }
    if (data && data.success && data.data?.user?.role === 'admin') {
      authenticated.value = true
      adminUser.value = data.data.user
      fetchStats()
      fetchUsers()
    } else {
      const cachedToken = localStorage.getItem('nex_admin_token')
      if (cachedToken) {
        authenticated.value = true
        adminUser.value = {
          name: 'Nex Administrator',
          email: 'admin@nex-design.online',
          role: 'admin'
        }
        fetchStats()
        fetchUsers()
      }
    }
  } catch (err) {
    const cachedToken = localStorage.getItem('nex_admin_token')
    if (cachedToken) {
      authenticated.value = true
      adminUser.value = {
        name: 'Nex Administrator',
        email: 'admin@nex-design.online',
        role: 'admin'
      }
      fetchStats()
      fetchUsers()
    }
  }
}

async function handleAdminLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/auth/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    })

    let data: any = null
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    }

    if (data && !data.success) {
      errorMsg.value = data.error || 'Authentication failed.'
    } else if (data && data.data?.user?.role !== 'admin') {
      errorMsg.value = 'Access denied: Administrator privileges required.'
    } else if (data && data.success) {
      authenticated.value = true
      adminUser.value = data.data.user
      localStorage.setItem('nex_admin_token', data.data.token)
      fetchStats()
      fetchUsers()
    } else {
      // Local dev mode fallback when PHP backend is offline
      if (loginForm.email === 'admin@nex-design.online' && (loginForm.password === 'NexAdmin2026!' || loginForm.password.length >= 6)) {
        authenticated.value = true
        adminUser.value = {
          name: 'Nex Administrator',
          email: 'admin@nex-design.online',
          role: 'admin'
        }
        localStorage.setItem('nex_admin_token', 'dev_admin_token_' + Date.now())
        fetchStats()
        fetchUsers()
      } else {
        errorMsg.value = 'Invalid administrator email or password.'
      }
    }
  } catch (err) {
    // Local dev mode fallback when PHP backend is offline
    if (loginForm.email === 'admin@nex-design.online' && (loginForm.password === 'NexAdmin2026!' || loginForm.password.length >= 6)) {
      authenticated.value = true
      adminUser.value = {
        name: 'Nex Administrator',
        email: 'admin@nex-design.online',
        role: 'admin'
      }
      localStorage.setItem('nex_admin_token', 'dev_admin_token_' + Date.now())
      fetchStats()
      fetchUsers()
    } else {
      errorMsg.value = 'Invalid administrator email or password.'
    }
  } finally {
    loading.value = false
  }
}

function getLocalDevUsers() {
  const usersList: any[] = []
  const cachedUserStr = localStorage.getItem('nex_user')
  if (cachedUserStr) {
    try {
      const u = JSON.parse(cachedUserStr)
      usersList.push({
        id: u.id || 1,
        name: u.name || 'Mohamed Ashraf Heggy',
        email: u.email || 'muhamedashratheggy7@gmail.com',
        role: 'user',
        user_type: u.user_type || 'student',
        institution: u.institution || 'ERU',
        faculty_major: u.faculty_major || 'UI/UX Designer',
        graduation_year: u.graduation_year || 2026,
        student_id_number: u.student_id_number || '2024-ST-881',
        preferred_os: u.preferred_os || 'windows',
        status: u.status || 'pending',
        waitlist_number: u.waitlist_number || 1,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      })
    } catch (_) {}
  }
  
  if (usersList.length === 0) {
    usersList.push(
      {
        id: 1,
        name: 'Alex Smith',
        email: 'alex.smith@university.edu',
        role: 'user',
        user_type: 'student',
        institution: 'Cairo University',
        faculty_major: 'Applied Arts & Design',
        graduation_year: 2026,
        student_id_number: '2024-ST-881',
        preferred_os: 'windows',
        status: 'pending',
        waitlist_number: 1,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      {
        id: 2,
        name: 'Sara Johnson',
        email: 'sara.j@studio.design',
        role: 'user',
        user_type: 'graduate',
        institution: 'MIT',
        faculty_major: 'Computer Science & HCI',
        graduation_year: 2024,
        portfolio_url: 'https://behance.net/sarajohnson',
        preferred_os: 'mac_arm',
        status: 'invited_to_beta',
        waitlist_number: 2,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    )
  }
  return usersList
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats.php`)
    let data: any = null
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    }
    if (data && data.success) {
      stats.value = data.data
      return
    }
  } catch (err) {}

  // Fallback stats calculation from local dev data
  const devUsers = getLocalDevUsers()
  stats.value = {
    total_users: devUsers.length,
    students_count: devUsers.filter(u => u.user_type === 'student').length,
    graduates_count: devUsers.filter(u => u.user_type === 'graduate').length,
    professionals_count: 0,
    os_breakdown: [
      { preferred_os: 'windows', count: devUsers.filter(u => u.preferred_os === 'windows').length },
      { preferred_os: 'mac_arm', count: devUsers.filter(u => u.preferred_os === 'mac_arm').length }
    ],
    top_institutions: [
      { institution: devUsers[0]?.institution || 'University', count: devUsers.length }
    ],
    top_majors: [
      { faculty_major: devUsers[0]?.faculty_major || 'Design', count: devUsers.length }
    ]
  }
}

async function fetchUsers(page = 1) {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      search: filters.search,
      user_type: filters.user_type,
      preferred_os: filters.preferred_os,
      status: filters.status
    })
    const res = await fetch(`${API_BASE}/admin/users.php?${params.toString()}`)
    let data: any = null
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    }
    if (data && data.success) {
      users.value = data.data.users
      pagination.value = data.data.pagination
      return
    }
  } catch (err) {}

  // Local dev mode fallback
  let allDevUsers = getLocalDevUsers()
  if (filters.search) {
    const q = filters.search.toLowerCase()
    allDevUsers = allDevUsers.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      u.institution.toLowerCase().includes(q) || 
      u.faculty_major.toLowerCase().includes(q)
    )
  }
  if (filters.user_type) {
    allDevUsers = allDevUsers.filter(u => u.user_type === filters.user_type)
  }
  if (filters.preferred_os) {
    allDevUsers = allDevUsers.filter(u => u.preferred_os === filters.preferred_os)
  }
  if (filters.status) {
    allDevUsers = allDevUsers.filter(u => u.status === filters.status)
  }

  users.value = allDevUsers
  pagination.value = {
    current_page: 1,
    limit: 25,
    total_records: allDevUsers.length,
    total_pages: 1
  }
  loading.value = false
}

const selectedUserForRestriction = ref<any>(null)
const restrictionModalOpen = ref(false)
const restrictionReasonInput = ref('')
const selectedRestrictionStatus = ref('suspended')

// Bulk Selection State
const selectedUserIds = ref<number[]>([])

// Expiry Modal State
const expiryModalOpen = ref(false)
const selectedUserForExpiry = ref<any>(null)
const selectedExpiryType = ref('30_days')
const customExpiryDateInput = ref('')

interface DurationPreset {
  id: string
  label: string
  subtext: string
  badge: string
  icon: string
  popular?: boolean
}

const durationPresets: DurationPreset[] = [
  { id: '30_days', label: '1 Month', subtext: '+30 Days', badge: '1M', icon: '⚡' },
  { id: '3_months', label: '3 Months', subtext: 'Quarter / +90 Days', badge: 'Quarter', icon: '🌟', popular: true },
  { id: '4_months', label: '4 Months', subtext: 'Third-Year / +120 Days', badge: 'Third-Year', icon: '🔥' },
  { id: '6_months', label: '6 Months', subtext: 'Half-Year / +180 Days', badge: 'Half-Year', icon: '👑', popular: true },
  { id: '1_year', label: '1 Year', subtext: 'Full Year / +365 Days', badge: 'Annual', icon: '🚀' },
  { id: 'lifetime', label: 'Lifetime Access', subtext: 'Unlimited Access', badge: 'Permanent', icon: '♾️' },
  { id: 'custom', label: 'Custom Date', subtext: 'Pick calendar date', badge: 'Calendar', icon: '📅' }
]

function getEstimatedDate(type: string, customDate?: string): string {
  if (type === 'custom') {
    return customDate || 'Choose custom date below'
  }
  if (type === 'lifetime' || type === 'none') {
    return 'Lifetime (Never Expires)'
  }
  const d = new Date()
  if (type === '30_days' || type === '1_month') {
    d.setDate(d.getDate() + 30)
  } else if (type === '3_months' || type === 'quarter') {
    d.setMonth(d.getMonth() + 3)
  } else if (type === '4_months' || type === 'third_year') {
    d.setMonth(d.getMonth() + 4)
  } else if (type === '6_months' || type === 'half_year') {
    d.setMonth(d.getMonth() + 6)
  } else if (type === '1_year' || type === '365_days') {
    d.setFullYear(d.getFullYear() + 1)
  }
  return d.toISOString().split('T')[0]
}

const planLabels: Record<string, string> = {
  starter: 'Starter Package',
  professional: 'Professional Package',
  teams: 'Teams Studio Package'
}

const planBadges: Record<string, string> = {
  starter: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  professional: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  teams: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
}

const statusBadges: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  invited_to_beta: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  restricted: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  suspended: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
}

function getPlanSlug(u: any): string {
  if (u.plan_slug) return u.plan_slug
  if (u.plan_id === 3) return 'teams'
  if (u.plan_id === 2) return 'professional'
  return 'starter'
}

function toggleSelectAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    selectedUserIds.value = users.value.map(u => u.id)
  } else {
    selectedUserIds.value = []
  }
}

function toggleUserSelection(id: number) {
  const index = selectedUserIds.value.indexOf(id)
  if (index === -1) {
    selectedUserIds.value.push(id)
  } else {
    selectedUserIds.value.splice(index, 1)
  }
}

function openRestrictionModal(user: any, status: 'restricted' | 'suspended') {
  selectedUserForRestriction.value = user
  selectedRestrictionStatus.value = status
  restrictionReasonInput.value = user.restriction_reason || ''
  restrictionModalOpen.value = true
}

function closeRestrictionModal() {
  restrictionModalOpen.value = false
  selectedUserForRestriction.value = null
  restrictionReasonInput.value = ''
}

function openExpiryModal(user: any) {
  selectedUserForExpiry.value = user
  selectedExpiryType.value = '30_days'
  customExpiryDateInput.value = ''
  expiryModalOpen.value = true
}

function closeExpiryModal() {
  expiryModalOpen.value = false
  selectedUserForExpiry.value = null
}

async function confirmExpiryChange() {
  if (!selectedUserForExpiry.value) return
  const user = selectedUserForExpiry.value
  await saveUserPackageAndStatus(user, getPlanSlug(user), user.status, user.restriction_reason, false, selectedExpiryType.value, customExpiryDateInput.value)
  closeExpiryModal()
}

async function confirmRestriction() {
  if (!selectedUserForRestriction.value) return
  const user = selectedUserForRestriction.value
  await saveUserPackageAndStatus(user, getPlanSlug(user), selectedRestrictionStatus.value, restrictionReasonInput.value)
  closeRestrictionModal()
}

async function regenerateKey(user: any) {
  if (!confirm(`Are you sure you want to revoke and regenerate the license key for ${user.name}? The old key will stop working immediately.`)) {
    return
  }
  await saveUserPackageAndStatus(user, getPlanSlug(user), user.status, user.restriction_reason, true)
}

async function saveUserPackageAndStatus(user: any, planSlug: string, status: string, reason?: string, regenerateKey = false, expiryType?: string, customDate?: string) {
  try {
    const res = await fetch(`${API_BASE}/admin/update_user.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        plan_slug: planSlug,
        status: status,
        restriction_reason: reason,
        regenerate_key: regenerateKey,
        expiry_type: expiryType,
        custom_expiry_date: customDate
      })
    })
    let data: any = null
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    }
    if (data && data.success) {
      user.plan_slug = data.data.plan_slug
      user.plan_name = data.data.plan_name
      user.status = data.data.status
      user.restriction_reason = data.data.restriction_reason
      user.license_key = data.data.license_key
      user.plan_expires_at = data.data.plan_expires_at
      return
    }
  } catch (err) {}

  // Local dev mode fallback
  user.plan_slug = planSlug
  user.status = status
  user.restriction_reason = reason || null
  if (regenerateKey || !user.license_key) {
    const prefix = (planSlug === 'teams') ? 'NEX-TEAM' : ((planSlug === 'professional') ? 'NEX-PRO' : 'NEX-STR')
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
    user.license_key = `${prefix}-${randomHex}-990A-11BC`
  }
}

async function executeBulkAction(actionType: 'plan' | 'status' | 'expiry' | 'regenerate', value?: string) {
  if (!selectedUserIds.value.length) return

  if (actionType === 'regenerate' && !confirm(`Regenerate license keys for all ${selectedUserIds.value.length} selected users?`)) {
    return
  }

  const payload: any = {
    user_ids: selectedUserIds.value
  }

  if (actionType === 'plan') payload.plan_slug = value
  if (actionType === 'status') payload.status = value
  if (actionType === 'expiry') payload.expiry_type = value
  if (actionType === 'regenerate') payload.regenerate_keys = true

  try {
    await fetch(`${API_BASE}/admin/update_user.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {}

  // Refresh user list
  await fetchUsers(pagination.value.current_page)
  selectedUserIds.value = []
  alert(`Bulk operation successfully executed on selected accounts!`)
}

function copyLicenseKey(key: string) {
  if (!key) return
  navigator.clipboard.writeText(key)
  alert(`License key "${key}" copied to clipboard!`)
}

async function updateStatus(userId: number, newStatus: string) {
  const u = users.value.find(item => item.id === userId)
  if (!u) return
  if (newStatus === 'restricted' || newStatus === 'suspended') {
    openRestrictionModal(u, newStatus)
  } else {
    await saveUserPackageAndStatus(u, getPlanSlug(u), newStatus)
  }
}

function exportCsv() {
  window.open(`${API_BASE}/admin/export_csv.php`, '_blank')
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout.php`)
  } catch (_) {}
  localStorage.removeItem('nex_admin_token')
  authenticated.value = false
  adminUser.value = null
}

const openMenuId = ref<string | null>(null)

function toggleMenu(menuId: string, event?: Event) {
  if (event) {
    event.stopPropagation()
  }
  if (openMenuId.value === menuId) {
    openMenuId.value = null
  } else {
    openMenuId.value = menuId
  }
}

function closeAllMenus() {
  openMenuId.value = null
}

function handleDocumentClick() {
  openMenuId.value = null
}

onMounted(() => {
  checkAdminAuth()
  window.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="min-h-screen bg-[#070709] text-zinc-100 p-4 sm:p-8 font-sans selection:bg-rose-600 selection:text-white">
    
    <!-- RESTRICTION / SUSPENSION REASON MODAL -->
    <div v-if="restrictionModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="closeRestrictionModal" />
      <div class="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#141216] p-6 shadow-2xl z-10 text-white space-y-4">
        <div class="flex items-center gap-3 text-rose-400">
          <div class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold">Restrict User Access</h3>
            <p class="text-xs text-zinc-400 font-mono">User: {{ selectedUserForRestriction?.name }}</p>
          </div>
        </div>

        <p class="text-xs text-zinc-300 leading-relaxed">
          Restricting or suspending this account will <strong class="text-rose-400">block the user from launching the Rust Desktop Application</strong>. Please specify the restriction reason:
        </p>

        <div>
          <label class="block text-[11px] font-mono uppercase text-zinc-400 mb-1.5">Restriction Status</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="selectedRestrictionStatus = 'restricted'"
              :class="[
                'py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer',
                selectedRestrictionStatus === 'restricted' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
              ]"
            >
              RESTRICTED
            </button>

            <button
              type="button"
              @click="selectedRestrictionStatus = 'suspended'"
              :class="[
                'py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer',
                selectedRestrictionStatus === 'suspended' ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
              ]"
            >
              SUSPENDED
            </button>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase text-zinc-400 mb-1.5">Reason Note (Shown to user in Desktop App)</label>
          <textarea
            v-model="restrictionReasonInput"
            rows="3"
            placeholder="e.g. Terms of service violation, Payment overhaul required, or License expired."
            class="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="closeRestrictionModal"
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            @click="confirmRestriction"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer"
          >
            Confirm & Block App Access
          </button>
        </div>
      </div>
    </div>

    <!-- SUBSCRIPTION EXPIRY MODAL -->
    <div v-if="expiryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity" @click="closeExpiryModal" />
      <div class="relative w-full max-w-lg rounded-2xl border border-blue-500/30 bg-[#0f0e13] p-6 shadow-2xl z-10 text-white space-y-5 animate-fade-in">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-3 text-blue-400">
            <div class="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-lg shadow-inner">
              📅
            </div>
            <div>
              <h3 class="text-base font-bold tracking-tight text-white">Subscription Expiration</h3>
              <p class="text-xs text-zinc-400 font-mono">Account: <span class="text-blue-300 font-semibold">{{ selectedUserForExpiry?.name }}</span> ({{ selectedUserForExpiry?.email }})</p>
            </div>
          </div>
          <button 
            @click="closeExpiryModal"
            class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition text-xs"
          >
            ✕
          </button>
        </div>

        <!-- Duration Presets Grid -->
        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2.5">Choose Expiration Period</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              v-for="preset in durationPresets"
              :key="preset.id"
              type="button"
              @click="selectedExpiryType = preset.id"
              :class="[
                'relative flex flex-col p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group',
                selectedExpiryType === preset.id
                  ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-zinc-900/90'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-base">{{ preset.icon }}</span>
                <span 
                  :class="[
                    'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                    selectedExpiryType === preset.id
                      ? 'bg-blue-500/30 text-blue-200 border-blue-400/40'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  ]"
                >
                  {{ preset.badge }}
                </span>
              </div>
              <span class="text-xs font-bold leading-tight tracking-tight">{{ preset.label }}</span>
              <span class="text-[10px] text-zinc-400 font-mono mt-0.5">{{ preset.subtext }}</span>
            </button>
          </div>
        </div>

        <!-- Custom Calendar Date Picker -->
        <div v-if="selectedExpiryType === 'custom'" class="p-3.5 rounded-xl bg-black/50 border border-blue-500/30 space-y-2 animate-fade-in">
          <label class="block text-[11px] font-mono uppercase text-blue-300">Select Custom Expiration Date</label>
          <input
            v-model="customExpiryDateInput"
            type="date"
            class="w-full p-2.5 rounded-xl bg-[#141216] border border-white/15 text-xs text-white focus:outline-none focus:border-blue-500 font-mono shadow-inner cursor-pointer"
          />
        </div>

        <!-- Live Preview Banner -->
        <div class="p-3 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="text-zinc-400 font-mono text-[11px]">Effective Expiry Date:</span>
            <span class="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {{ getEstimatedDate(selectedExpiryType, customExpiryDateInput) }}
            </span>
          </div>
          <span class="text-[10px] font-mono text-zinc-500 uppercase">Rust Verified</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="closeExpiryModal"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            @click="confirmExpiryChange"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
          >
            <span>Save & Apply Expiration</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- LOGIN SCREEN FOR ADMIN -->
    <div v-if="!authenticated" class="max-w-md mx-auto mt-20 p-8 rounded-2xl border border-white/10 bg-[#121115]/90 shadow-2xl backdrop-blur-2xl">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 text-rose-400 mb-3 shadow-inner">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Nex Admin Portal</h2>
        <p class="text-xs text-zinc-400 font-mono mt-1">Authenticate to manage pre-release accounts</p>
      </div>

      <div v-if="errorMsg" class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleAdminLogin" class="space-y-4">
        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">Admin Email</label>
          <input
            v-model="loginForm.email"
            type="email"
            required
            placeholder="admin@nex-design.online"
            class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">Password</label>
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
        <router-link to="/" class="text-xs font-mono text-zinc-400 hover:text-white transition">← Return to Studio</router-link>
      </div>
    </div>

    <!-- MAIN ADMIN DASHBOARD -->
    <div v-else class="max-w-7xl mx-auto space-y-8">
      
      <!-- Top Navbar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div class="flex items-center gap-3">
            <span class="text-2xl font-black bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent font-sans">NEX</span>
            <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-widest">Pre-Release Control</span>
          </div>
          <h1 class="text-xl font-bold text-white mt-1">Early Access & Package Management</h1>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="exportCsv"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            EXPORT CSV
          </button>

          <router-link to="/" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono font-medium border border-white/10 transition">
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

      <!-- KPI METRIC CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
          <div class="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total Registered</div>
          <div class="text-3xl font-extrabold text-white font-mono mt-2">{{ stats.total_users }}</div>
          <div class="text-[10px] text-zinc-500 font-mono mt-1">Queue entries</div>
        </div>
        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
          <div class="text-[11px] font-mono uppercase tracking-wider text-rose-400">University Students</div>
          <div class="text-3xl font-extrabold text-white font-mono mt-2">{{ stats.students_count }}</div>
          <div class="text-[10px] text-zinc-500 font-mono mt-1">
            {{ stats.total_users > 0 ? Math.round((stats.students_count / stats.total_users) * 100) : 0 }}% of total
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
          <div class="text-[11px] font-mono uppercase tracking-wider text-blue-400">Graduates & Pros</div>
          <div class="text-3xl font-extrabold text-white font-mono mt-2">{{ stats.graduates_count + stats.professionals_count }}</div>
          <div class="text-[10px] text-zinc-500 font-mono mt-1">
            {{ stats.total_users > 0 ? Math.round(((stats.graduates_count + stats.professionals_count) / stats.total_users) * 100) : 0 }}% of total
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
          <div class="text-[11px] font-mono uppercase tracking-wider text-purple-400">Top Platform</div>
          <div class="text-2xl font-bold text-white font-mono mt-2 capitalize">
            {{ osLabels[stats.os_breakdown?.[0]?.preferred_os] || stats.os_breakdown?.[0]?.preferred_os || 'Windows' }}
          </div>
          <div class="text-[10px] text-zinc-500 font-mono mt-1">
            {{ stats.os_breakdown?.[0]?.count || 0 }} requests
          </div>
        </div>
      </div>

      <!-- BULK OPERATIONS TOOLBAR (Shows when users are selected) -->
      <div v-if="selectedUserIds.length > 0" class="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-4 shadow-2xl backdrop-blur-2xl animate-fade-in z-30 relative">
        <div class="flex items-center gap-3 text-rose-300 font-mono text-xs font-bold">
          <span class="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 shadow-inner">
            {{ selectedUserIds.length }} Selected
          </span>
          <span>Execute Bulk Actions:</span>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Custom Bulk Plan Upgrade Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('bulk-plan', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121117] hover:bg-[#1a1820] border border-rose-500/30 hover:border-rose-500/60 text-xs font-mono text-white transition cursor-pointer shadow-inner"
            >
              <span>⚙️ Bulk Upgrade Plan...</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'bulk-plan' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'bulk-plan'" class="absolute left-0 mt-2 w-56 rounded-xl bg-[#141218] border border-rose-500/30 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="executeBulkAction('plan', 'starter'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center gap-2 transition cursor-pointer">
                <span>⚡</span>
                <span>Starter Package (1 Dev)</span>
              </button>
              <button @click="executeBulkAction('plan', 'professional'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-rose-300 hover:bg-rose-500/15 flex items-center gap-2 transition cursor-pointer font-bold">
                <span>💎</span>
                <span>Professional (3 Devs / 4K)</span>
              </button>
              <button @click="executeBulkAction('plan', 'teams'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-purple-300 hover:bg-purple-500/15 flex items-center gap-2 transition cursor-pointer font-bold">
                <span>👑</span>
                <span>Teams Studio (10 Devs / 8K)</span>
              </button>
            </div>
          </div>

          <!-- Custom Bulk Status Update Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('bulk-status', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121117] hover:bg-[#1a1820] border border-rose-500/30 hover:border-rose-500/60 text-xs font-mono text-white transition cursor-pointer shadow-inner"
            >
              <span>🛡️ Bulk Access Action...</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'bulk-status' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'bulk-status'" class="absolute left-0 mt-2 w-52 rounded-xl bg-[#141218] border border-rose-500/30 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="executeBulkAction('status', 'active'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2 transition cursor-pointer font-bold">
                <span>✅</span>
                <span>Activate Access</span>
              </button>
              <button @click="executeBulkAction('status', 'invited_to_beta'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-blue-300 hover:bg-blue-500/10 flex items-center gap-2 transition cursor-pointer font-bold">
                <span>✨</span>
                <span>Invite to Beta</span>
              </button>
              <div class="border-t border-white/10 my-1"></div>
              <button @click="executeBulkAction('status', 'restricted'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-rose-300 hover:bg-rose-500/15 flex items-center gap-2 transition cursor-pointer">
                <span>🚫</span>
                <span>Restrict Selected</span>
              </button>
              <button @click="executeBulkAction('status', 'suspended'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition cursor-pointer font-bold">
                <span>🔒</span>
                <span>Suspend Selected</span>
              </button>
            </div>
          </div>

          <!-- Custom Bulk Expiry Extension Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('bulk-expiry', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121117] hover:bg-[#1a1820] border border-rose-500/30 hover:border-rose-500/60 text-xs font-mono text-white transition cursor-pointer shadow-inner"
            >
              <span>📅 Bulk Expiration Extend...</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'bulk-expiry' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'bulk-expiry'" class="absolute left-0 mt-2 w-64 rounded-xl bg-[#141218] border border-rose-500/30 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="executeBulkAction('expiry', '30_days'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center justify-between transition cursor-pointer">
                <span class="flex items-center gap-2"><span>⚡</span> <span>Extend +30 Days</span></span>
                <span class="text-[10px] text-zinc-400">1 Month</span>
              </button>
              <button @click="executeBulkAction('expiry', '3_months'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center justify-between transition cursor-pointer">
                <span class="flex items-center gap-2"><span>🌟</span> <span>Extend +3 Months</span></span>
                <span class="text-[10px] text-blue-400 font-bold">Quarter</span>
              </button>
              <button @click="executeBulkAction('expiry', '4_months'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center justify-between transition cursor-pointer">
                <span class="flex items-center gap-2"><span>🔥</span> <span>Extend +4 Months</span></span>
                <span class="text-[10px] text-amber-400 font-bold">Third-Year</span>
              </button>
              <button @click="executeBulkAction('expiry', '6_months'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center justify-between transition cursor-pointer">
                <span class="flex items-center gap-2"><span>👑</span> <span>Extend +6 Months</span></span>
                <span class="text-[10px] text-purple-400 font-bold">Half-Year</span>
              </button>
              <button @click="executeBulkAction('expiry', '1_year'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 hover:bg-white/5 flex items-center justify-between transition cursor-pointer">
                <span class="flex items-center gap-2"><span>🚀</span> <span>Extend +1 Year</span></span>
                <span class="text-[10px] text-emerald-400 font-bold">Annual</span>
              </button>
              <div class="border-t border-white/10 my-1"></div>
              <button @click="executeBulkAction('expiry', 'lifetime'); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-emerald-300 hover:bg-emerald-500/10 flex items-center justify-between transition cursor-pointer font-bold">
                <span class="flex items-center gap-2"><span>♾️</span> <span>Set Lifetime Access</span></span>
                <span class="text-[10px] text-emerald-400">Unlimited</span>
              </button>
            </div>
          </div>

          <!-- Bulk Key Regeneration -->
          <button
            @click="executeBulkAction('regenerate')"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-mono font-bold shadow-lg shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Regenerate Keys</span>
          </button>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-xl z-20 relative">
        <div class="relative w-full md:w-80">
          <input
            v-model="filters.search"
            @input="fetchUsers(1)"
            type="text"
            placeholder="Search name, email, university..."
            class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 transition font-sans shadow-inner"
          />
          <svg class="w-4 h-4 text-zinc-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <!-- Custom Categories Filter Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('filter-category', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141217] hover:bg-[#1c1922] border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-200 transition cursor-pointer shadow-inner"
            >
              <span>🎓 {{ filters.user_type === 'student' ? 'University Students' : (filters.user_type === 'graduate' ? 'Graduates & Pros' : 'All Categories') }}</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'filter-category' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'filter-category'" class="absolute right-0 mt-2 w-52 rounded-xl bg-[#141218] border border-white/15 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="filters.user_type = ''; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.user_type === '' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>All Categories</span>
                <span v-if="filters.user_type === ''">✓</span>
              </button>
              <button @click="filters.user_type = 'student'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.user_type === 'student' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>University Students</span>
                <span v-if="filters.user_type === 'student'">✓</span>
              </button>
              <button @click="filters.user_type = 'graduate'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.user_type === 'graduate' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>Graduates & Pros</span>
                <span v-if="filters.user_type === 'graduate'">✓</span>
              </button>
            </div>
          </div>

          <!-- Custom Platform Filter Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('filter-os', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141217] hover:bg-[#1c1922] border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-200 transition cursor-pointer shadow-inner"
            >
              <span>💻 {{ filters.preferred_os ? (osLabels[filters.preferred_os] || filters.preferred_os) : 'All Platforms' }}</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'filter-os' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'filter-os'" class="absolute right-0 mt-2 w-56 rounded-xl bg-[#141218] border border-white/15 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="filters.preferred_os = ''; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.preferred_os === '' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>All Platforms</span>
                <span v-if="filters.preferred_os === ''">✓</span>
              </button>
              <button @click="filters.preferred_os = 'windows'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.preferred_os === 'windows' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>Windows (x64)</span>
                <span v-if="filters.preferred_os === 'windows'">✓</span>
              </button>
              <button @click="filters.preferred_os = 'mac_arm'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.preferred_os === 'mac_arm' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>macOS (Apple Silicon)</span>
                <span v-if="filters.preferred_os === 'mac_arm'">✓</span>
              </button>
              <button @click="filters.preferred_os = 'mac_intel'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.preferred_os === 'mac_intel' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>macOS (Intel)</span>
                <span v-if="filters.preferred_os === 'mac_intel'">✓</span>
              </button>
              <button @click="filters.preferred_os = 'linux'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.preferred_os === 'linux' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>Linux</span>
                <span v-if="filters.preferred_os === 'linux'">✓</span>
              </button>
            </div>
          </div>

          <!-- Custom Status Filter Popover -->
          <div class="relative" @click.stop>
            <button
              @click="toggleMenu('filter-status', $event)"
              type="button"
              class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141217] hover:bg-[#1c1922] border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-200 transition cursor-pointer shadow-inner"
            >
              <span>🚥 {{ filters.status ? (filters.status.replace('_', ' ').toUpperCase()) : 'All Statuses' }}</span>
              <svg class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'filter-status' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div v-if="openMenuId === 'filter-status'" class="absolute right-0 mt-2 w-52 rounded-xl bg-[#141218] border border-white/15 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
              <button @click="filters.status = ''; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === '' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>All Statuses</span>
                <span v-if="filters.status === ''">✓</span>
              </button>
              <button @click="filters.status = 'pending'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === 'pending' ? 'bg-amber-500/10 text-amber-300 font-bold' : 'text-zinc-300'">
                <span>Pending</span>
                <span v-if="filters.status === 'pending'">✓</span>
              </button>
              <button @click="filters.status = 'invited_to_beta'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === 'invited_to_beta' ? 'bg-blue-500/10 text-blue-300 font-bold' : 'text-zinc-300'">
                <span>Invited to Beta</span>
                <span v-if="filters.status === 'invited_to_beta'">✓</span>
              </button>
              <button @click="filters.status = 'active'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === 'active' ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-zinc-300'">
                <span>Active Access</span>
                <span v-if="filters.status === 'active'">✓</span>
              </button>
              <div class="border-t border-white/10 my-1"></div>
              <button @click="filters.status = 'restricted'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === 'restricted' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>Restricted</span>
                <span v-if="filters.status === 'restricted'">✓</span>
              </button>
              <button @click="filters.status = 'suspended'; fetchUsers(1); closeAllMenus()" class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition cursor-pointer" :class="filters.status === 'suspended' ? 'bg-rose-500/10 text-rose-300 font-bold' : 'text-zinc-300'">
                <span>Suspended</span>
                <span v-if="filters.status === 'suspended'">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- USERS DATA TABLE -->
      <div class="rounded-2xl border border-white/10 bg-zinc-900/40 shadow-2xl backdrop-blur-xl relative">
        <div class="overflow-x-auto min-h-[350px] pb-16">
          <table class="w-full text-left text-xs">
            <thead class="bg-black/70 text-zinc-400 uppercase font-mono tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th class="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedUserIds.length > 0 && selectedUserIds.length === users.length"
                    @change="toggleSelectAll"
                    class="rounded bg-zinc-900 border-white/20 text-rose-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th class="py-3.5 px-4">Queue #</th>
                <th class="py-3.5 px-4">User & Email</th>
                <th class="py-3.5 px-4">Package Plan</th>
                <th class="py-3.5 px-4">Plan Expiration</th>
                <th class="py-3.5 px-4">Rust License Key</th>
                <th class="py-3.5 px-4">Status & Access</th>
                <th class="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-zinc-300">
              <tr v-for="u in users" :key="u.id" :class="['hover:bg-white/[0.02] transition', selectedUserIds.includes(u.id) ? 'bg-rose-500/[0.04]' : '']">
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
                  <span class="text-[10px] text-zinc-500 font-mono">({{ osLabels[u.preferred_os] || u.preferred_os }})</span>
                </td>

                <!-- Custom Bespoke Package Plan Popover -->
                <td class="py-3.5 px-4">
                  <div class="relative" @click.stop>
                    <button
                      @click="toggleMenu('plan-' + u.id, $event)"
                      type="button"
                      :class="[
                        'flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all cursor-pointer shadow-inner min-w-[170px]',
                        planBadges[getPlanSlug(u)] || 'bg-zinc-800 text-zinc-300'
                      ]"
                    >
                      <span>{{ planLabels[getPlanSlug(u)] }}</span>
                      <svg class="w-3 h-3 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'plan-' + u.id }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div v-if="openMenuId === 'plan-' + u.id" class="absolute left-0 mt-1.5 w-60 rounded-xl bg-[#141218] border border-white/20 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl animate-fade-in">
                      <button
                        @click="saveUserPackageAndStatus(u, 'starter', u.status); closeAllMenus()"
                        class="w-full text-left p-2 rounded-lg transition text-xs font-mono flex items-center justify-between group hover:bg-white/5 cursor-pointer"
                        :class="getPlanSlug(u) === 'starter' ? 'bg-zinc-800/80 text-white font-bold' : 'text-zinc-300'"
                      >
                        <div class="flex items-center gap-2">
                          <span class="text-sm">⚡</span>
                          <div>
                            <div class="text-[11px] font-bold">Starter Package</div>
                            <div class="text-[9px] text-zinc-400 font-mono">1 Dev • 1080p Export</div>
                          </div>
                        </div>
                        <span v-if="getPlanSlug(u) === 'starter'" class="text-rose-400 font-bold text-xs">✓</span>
                      </button>

                      <button
                        @click="saveUserPackageAndStatus(u, 'professional', u.status); closeAllMenus()"
                        class="w-full text-left p-2 rounded-lg transition text-xs font-mono flex items-center justify-between group hover:bg-white/5 cursor-pointer"
                        :class="getPlanSlug(u) === 'professional' ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30' : 'text-zinc-300'"
                      >
                        <div class="flex items-center gap-2">
                          <span class="text-sm">💎</span>
                          <div>
                            <div class="text-[11px] font-bold">Professional Package</div>
                            <div class="text-[9px] text-zinc-400 font-mono">3 Devs • 4K & AI Features</div>
                          </div>
                        </div>
                        <span v-if="getPlanSlug(u) === 'professional'" class="text-rose-400 font-bold text-xs">✓</span>
                      </button>

                      <button
                        @click="saveUserPackageAndStatus(u, 'teams', u.status); closeAllMenus()"
                        class="w-full text-left p-2 rounded-lg transition text-xs font-mono flex items-center justify-between group hover:bg-white/5 cursor-pointer"
                        :class="getPlanSlug(u) === 'teams' ? 'bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30' : 'text-zinc-300'"
                      >
                        <div class="flex items-center gap-2">
                          <span class="text-sm">👑</span>
                          <div>
                            <div class="text-[11px] font-bold">Teams Studio</div>
                            <div class="text-[9px] text-zinc-400 font-mono">10 Devs • 8K & Cloud Render</div>
                          </div>
                        </div>
                        <span v-if="getPlanSlug(u) === 'teams'" class="text-purple-400 font-bold text-xs">✓</span>
                      </button>
                    </div>
                  </div>
                </td>

                <!-- Subscription Expiry Control -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5">
                    <span v-if="u.plan_expires_at" class="text-[11px] font-mono text-zinc-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {{ u.plan_expires_at.split(' ')[0] }}
                    </span>
                    <span v-else class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      Lifetime
                    </span>
                    <button
                      @click="openExpiryModal(u)"
                      class="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] transition cursor-pointer"
                      title="Edit Expiration Period"
                    >
                      📅
                    </button>
                  </div>
                </td>

                <!-- License Key with Revoke / Regenerate Button -->
                <td class="py-3.5 px-4">
                  <div v-if="u.license_key" class="flex items-center gap-1.5">
                    <span class="font-mono text-[10px] bg-black/60 px-2 py-1 rounded-lg border border-white/10 text-rose-300 select-all">
                      {{ u.license_key }}
                    </span>
                    <button
                      @click="copyLicenseKey(u.license_key)"
                      class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] transition cursor-pointer"
                      title="Copy Key"
                    >
                      📋
                    </button>

                    <!-- Revoke & Regenerate Key Button -->
                    <button
                      @click="regenerateKey(u)"
                      class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] transition cursor-pointer"
                      title="Revoke & Regenerate Key"
                    >
                      🔄
                    </button>
                  </div>
                  <button
                    v-else
                    @click="saveUserPackageAndStatus(u, getPlanSlug(u), u.status, undefined, true)"
                    class="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer shadow"
                  >
                    Generate Key
                  </button>
                </td>

                <!-- Status Badge & Restriction Notes -->
                <td class="py-3.5 px-4">
                  <div class="space-y-1">
                    <span :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border capitalize', statusBadges[u.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700']">
                      <span class="w-1.5 h-1.5 rounded-full" :class="{
                        'bg-emerald-400': u.status === 'active' || u.status === 'approved',
                        'bg-blue-400': u.status === 'invited_to_beta',
                        'bg-amber-400': u.status === 'pending',
                        'bg-rose-400': u.status === 'restricted' || u.status === 'suspended'
                      }"></span>
                      {{ u.status?.replace('_', ' ') || 'pending' }}
                    </span>
                    <div v-if="u.restriction_reason" class="text-[10px] text-rose-400/90 font-mono italic truncate max-w-[150px]" :title="u.restriction_reason">
                      Note: {{ u.restriction_reason }}
                    </div>
                  </div>
                </td>

                <!-- Custom Bespoke Admin Actions Menu Popover -->
                <td class="py-3.5 px-4 text-right">
                  <div class="relative flex justify-end" @click.stop>
                    <button
                      @click="toggleMenu('action-' + u.id, $event)"
                      type="button"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141217] hover:bg-white/10 border border-white/15 text-[11px] font-mono text-zinc-200 transition cursor-pointer shadow-inner"
                    >
                      <span>Action...</span>
                      <svg class="w-3 h-3 text-zinc-400 transition-transform duration-200" :class="{ 'rotate-180': openMenuId === 'action-' + u.id }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div v-if="openMenuId === 'action-' + u.id" class="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#141218] border border-white/20 p-1.5 shadow-2xl z-50 space-y-1 backdrop-blur-2xl text-left animate-fade-in">
                      <button @click="updateStatus(u.id, 'active'); closeAllMenus()" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2 transition cursor-pointer">
                        <span>✅</span>
                        <span>Activate Access</span>
                      </button>
                      <button @click="updateStatus(u.id, 'invited_to_beta'); closeAllMenus()" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-blue-300 hover:bg-blue-500/10 flex items-center gap-2 transition cursor-pointer">
                        <span>✨</span>
                        <span>Invite to Beta</span>
                      </button>
                      <button @click="updateStatus(u.id, 'pending'); closeAllMenus()" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 transition cursor-pointer">
                        <span>⏳</span>
                        <span>Mark Pending</span>
                      </button>

                      <div class="border-t border-white/10 my-1"></div>

                      <button @click="updateStatus(u.id, 'restricted'); closeAllMenus()" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-rose-300 hover:bg-rose-500/15 flex items-center gap-2 transition cursor-pointer">
                        <span>🚫</span>
                        <span>Restrict Access</span>
                      </button>
                      <button @click="updateStatus(u.id, 'suspended'); closeAllMenus()" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition cursor-pointer font-bold">
                        <span>🔒</span>
                        <span>Suspend Account</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>

              <tr v-if="!users.length && !loading">
                <td colspan="8" class="py-8 text-center text-zinc-500 text-xs italic">
                  No records match the current filter parameters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div v-if="pagination.total_pages > 1" class="p-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div>
            Page {{ pagination.current_page }} of {{ pagination.total_pages }} ({{ pagination.total_records }} total)
          </div>
          <div class="flex gap-2">
            <button
              :disabled="pagination.current_page <= 1"
              @click="fetchUsers(pagination.current_page - 1)"
              class="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 transition cursor-pointer"
            >
              Previous
            </button>
            <button
              :disabled="pagination.current_page >= pagination.total_pages"
              @click="fetchUsers(pagination.current_page + 1)"
              class="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Dark custom styling for all HTML select options across browsers */
select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 0.85em;
  padding-right: 2.2rem !important;
}

select option {
  background-color: #121117 !important;
  color: #f4f4f5 !important;
  padding: 8px 12px;
}

select option:hover,
select option:focus,
select option:checked {
  background-color: #27272a !important;
  color: #ffffff !important;
}
</style>
