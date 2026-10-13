<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/app/auth/store'
import { readLinkedAccountSession } from '@/app/dashboard/accounts/access'
import { getOrCreateDeviceId } from '@/app/dashboard/accounts/api'
import type { PreferredOS, UserType } from '@/app/auth/types'

const {
  currentUser,
  isProfileModalOpen,
  closeProfileModal,
  updateProfile,
  signOut
} = useAuthStore()
const router = useRouter()

type TabKey = 'identity' | 'academic' | 'environment'
const activeTab = ref<TabKey>('identity')

// Form state
const name = ref('')
const email = ref('')
const avatar = ref('')
const userType = ref<UserType>('student')
const institution = ref('')
const facultyMajor = ref('')
const graduationYear = ref(2026)
const studentIdNumber = ref('')
const currentRole = ref('')
const portfolioUrl = ref('')
const preferredOs = ref<PreferredOS>('windows')
const primaryUseCase = ref('UI/UX & Prototyping')
const isSaved = ref(false)
const copiedDeviceId = ref(false)

const linkedSession = computed(() => readLinkedAccountSession())
const deviceId = computed(() => getOrCreateDeviceId())

const osNames: Record<string, string> = {
  windows: 'Windows (x64)',
  mac_arm: 'macOS (Apple Silicon M-Series)',
  mac_intel: 'macOS (Intel Core)',
  linux: 'Linux (x86_64)'
}

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: number[] = []
  if (userType.value === 'student') {
    for (let y = currentYear; y <= currentYear + 6; y++) years.push(y)
  } else {
    for (let y = currentYear; y >= currentYear - 25; y--) years.push(y)
  }
  return years
})

watch(
  currentUser,
  (user) => {
    if (user) {
      name.value = user.name || ''
      email.value = user.email || ''
      avatar.value = user.avatar || ''
      userType.value = user.userType || 'student'
      institution.value = user.institution || ''
      facultyMajor.value = user.facultyMajor || ''
      graduationYear.value = user.graduationYear || 2026
      studentIdNumber.value = user.studentIdNumber || ''
      currentRole.value = user.currentRole || ''
      portfolioUrl.value = user.portfolioUrl || ''
      preferredOs.value = user.preferredOs || 'windows'
      primaryUseCase.value = user.primaryUseCase || 'UI/UX & Prototyping'
    }
  },
  { immediate: true }
)

function handleSave() {
  updateProfile({
    name: name.value.trim() || currentUser.value.name,
    email: email.value.trim() || currentUser.value.email,
    avatar: avatar.value.trim() || undefined,
    userType: userType.value,
    institution: institution.value.trim(),
    facultyMajor: facultyMajor.value.trim(),
    graduationYear: Number(graduationYear.value),
    studentIdNumber: studentIdNumber.value.trim(),
    currentRole: currentRole.value.trim(),
    portfolioUrl: portfolioUrl.value.trim(),
    preferredOs: preferredOs.value,
    primaryUseCase: primaryUseCase.value
  })
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
    closeProfileModal()
  }, 900)
}

function copyDeviceId() {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(deviceId.value)
    copiedDeviceId.value = true
    setTimeout(() => {
      copiedDeviceId.value = false
    }, 2000)
  }
}

async function handleSignOutAndClose() {
  closeProfileModal()
  signOut()
  await router.push('/login')
}
</script>

<template>
  <div
    v-if="isProfileModalOpen"
    class="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
  >
    <div
      class="w-full max-w-2xl rounded-3xl bg-zinc-950/95 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] flex flex-col overflow-hidden text-zinc-200 backdrop-blur-2xl"
    >
      <!-- Header with Profile Avatar and Waitlist Badge -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div class="flex items-center gap-3.5">
          <div
            class="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-900 border border-rose-500/40 overflow-hidden flex items-center justify-center font-extrabold text-white text-lg shrink-0 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
          >
            <img v-if="avatar" :src="avatar" :alt="name" class="w-full h-full object-cover" />
            <span v-else>{{ (name || 'U')[0].toUpperCase() }}</span>
            <span
              class="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950"
            />
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-white tracking-tight">
                {{ currentUser.name || 'User Profile' }}
              </h3>
              <span
                class="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30"
              >
                {{ (currentUser.planId || 'starter').replace('plan-', '') }}
              </span>
            </div>
            <p class="text-xs text-zinc-400">{{ currentUser.email }}</p>
          </div>
        </div>

        <!-- Early Access Queue & Status Pill -->
        <div class="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div
            class="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-right flex sm:flex-col items-center sm:items-end justify-between gap-2"
          >
            <span class="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              Queue Position
            </span>
            <span class="text-sm font-extrabold text-white">
              <span class="text-rose-500">#</span>{{ currentUser.waitlistNumber || '1' }}
            </span>
          </div>

          <button
            @click="closeProfileModal"
            class="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition border border-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-white/5 text-xs">
        <button
          type="button"
          @click="activeTab = 'identity'"
          class="flex-1 py-2 px-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
          :class="
            activeTab === 'identity'
              ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          "
        >
          <span>👤</span>
          <span>Identity & Account</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'academic'"
          class="flex-1 py-2 px-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
          :class="
            activeTab === 'academic'
              ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          "
        >
          <span>🎓</span>
          <span>Academic & Career</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'environment'"
          class="flex-1 py-2 px-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
          :class="
            activeTab === 'environment'
              ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          "
        >
          <span>⚡</span>
          <span>Engine & Device</span>
        </button>
      </div>

      <!-- Scrollable Tab Content -->
      <div class="overflow-y-auto space-y-4 pr-1 text-xs flex-1">
        <!-- TAB 1: IDENTITY & ACCOUNT -->
        <div v-if="activeTab === 'identity'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">Display Name</label>
              <input
                v-model="name"
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">Registered Email</label>
              <input
                v-model="email"
                type="email"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="name@institution.edu"
              />
            </div>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1.5 font-medium">Avatar Image URL</label>
            <input
              v-model="avatar"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
              placeholder="https://images.unsplash.com/... or https://github.com/..."
            />
          </div>

          <!-- Account Specs Banner -->
          <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">Account Role:</span>
              <span class="font-bold text-white uppercase text-[11px]">{{ currentUser.role }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">Email Status:</span>
              <span class="font-semibold text-emerald-400 flex items-center gap-1">
                ✓ Verified
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">Account ID:</span>
              <span class="font-mono text-zinc-400 text-[11px]">{{ currentUser.id }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">Beta Access Status:</span>
              <span class="font-semibold text-rose-400 uppercase text-[11px]">
                {{ currentUser.status || 'Active' }}
              </span>
            </div>
          </div>
        </div>

        <!-- TAB 2: ACADEMIC & CAREER -->
        <div v-if="activeTab === 'academic'" class="space-y-4">
          <!-- Profile Type Segmented Control -->
          <div>
            <label class="block text-zinc-400 mb-1.5 font-medium">Profile Category</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="userType = 'student'"
                class="p-3 rounded-xl border text-left transition flex items-center gap-2.5"
                :class="
                  userType === 'student'
                    ? 'bg-rose-600/15 border-rose-500 text-rose-200 font-semibold'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20'
                "
              >
                <span class="text-base">🎓</span>
                <div>
                  <div class="text-xs font-bold text-white">University Student</div>
                  <div class="text-[10px] text-zinc-400">Active undergraduate or graduate</div>
                </div>
              </button>

              <button
                type="button"
                @click="userType = 'graduate'"
                class="p-3 rounded-xl border text-left transition flex items-center gap-2.5"
                :class="
                  userType === 'graduate'
                    ? 'bg-rose-600/15 border-rose-500 text-rose-200 font-semibold'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20'
                "
              >
                <span class="text-base">💼</span>
                <div>
                  <div class="text-xs font-bold text-white">Graduate & Pro</div>
                  <div class="text-[10px] text-zinc-400">Alumni, studio designer or dev</div>
                </div>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">
                {{ userType === 'student' ? 'University / College' : 'Alma Mater / Company' }}
              </label>
              <input
                v-model="institution"
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="e.g. Cairo University, MIT, Studio"
              />
            </div>

            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">
                {{ userType === 'student' ? 'Faculty / Major' : 'Specialization or Role' }}
              </label>
              <input
                v-model="facultyMajor"
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="e.g. Computer Science, UI/UX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">
                {{ userType === 'student' ? 'Expected Graduation Year' : 'Graduated in Year' }}
              </label>
              <select
                v-model="graduationYear"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
              >
                <option v-for="year in yearOptions" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">
                {{ userType === 'student' ? 'Student ID (Optional)' : 'Current Role / Job Title' }}
              </label>
              <input
                v-if="userType === 'student'"
                v-model="studentIdNumber"
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="e.g. ST-88219"
              />
              <input
                v-else
                v-model="currentRole"
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
                placeholder="e.g. Lead Product Designer"
              />
            </div>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1.5 font-medium">Portfolio or GitHub Link</label>
            <input
              v-model="portfolioUrl"
              type="url"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition"
              placeholder="https://behance.net/you or https://github.com/you"
            />
          </div>
        </div>

        <!-- TAB 3: ENVIRONMENT & DEVICE -->
        <div v-if="activeTab === 'environment'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">Preferred Operating System</label>
              <select
                v-model="preferredOs"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
              >
                <option value="windows">{{ osNames.windows }}</option>
                <option value="mac_arm">{{ osNames.mac_arm }}</option>
                <option value="mac_intel">{{ osNames.mac_intel }}</option>
                <option value="linux">{{ osNames.linux }}</option>
              </select>
            </div>

            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">Primary Design Use Case</label>
              <select
                v-model="primaryUseCase"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
              >
                <option value="UI/UX & Prototyping">UI/UX & Interactive Prototyping</option>
                <option value="Design Systems & Tokens">Design Systems & Tokens Architecture</option>
                <option value="Vector Illustration & Icons">Vector Illustration & Iconography</option>
                <option value="Mobile App Interfaces">Mobile & Desktop App Design</option>
                <option value="Code-to-Design & JSX">Code-to-Design & AI Generation</option>
              </select>
            </div>
          </div>

          <!-- Hardware Device ID & Lease Specs -->
          <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-zinc-400 font-medium">Hardware Identifier (HWID / Device ID)</span>
                <button
                  type="button"
                  @click="copyDeviceId"
                  class="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                >
                  {{ copiedDeviceId ? '✓ Copied' : 'Copy HWID' }}
                </button>
              </div>
              <div class="p-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-zinc-300 truncate">
                {{ deviceId }}
              </div>
            </div>

            <div v-if="linkedSession?.lease" class="pt-2 border-t border-white/5 space-y-1.5">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">Offline Lease Token:</span>
                <span class="font-mono text-emerald-400 font-semibold">ES256 (P-256 Signed)</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-400">Lease Expires:</span>
                <span class="text-zinc-300 font-medium">
                  {{ new Date(linkedSession.lease.expiresAt).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="handleSignOutAndClose"
            class="px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>

          <span v-if="isSaved" class="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            ✓ Profile Details Saved Live
          </span>
          <span v-else class="text-[11px] text-zinc-500 hidden sm:inline">
            Synced with NexDesign Cloud Architecture
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="closeProfileModal"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSave"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition"
          >
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
