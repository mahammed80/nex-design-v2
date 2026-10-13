<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '@/app/auth/store'

const { direction = 'up' } = defineProps<{
  direction?: 'up' | 'down'
}>()

const router = useRouter()
const {
  currentUser,
  accountsList,
  switchAccount,
  signOut,
  openAuthModal,
  openProfileModal
} = useAuthStore()

const isOpen = ref(false)
const menuRef = ref<HTMLDivElement | null>(null)

onClickOutside(menuRef, () => {
  isOpen.value = false
})

function handleSwitchAccount(userId: string) {
  switchAccount(userId)
  isOpen.value = false
}

function handleAddAccount() {
  isOpen.value = false
  openAuthModal('signin')
}

function handleOpenProfile() {
  isOpen.value = false
  openProfileModal()
}

function handleGoAdmin() {
  isOpen.value = false
  router.push('/admin')
}

async function handleSignOut() {
  isOpen.value = false
  signOut()
  await router.push('/login')
}
</script>

<template>
  <div ref="menuRef" class="relative w-full">
    <!-- Trigger Button (Full Width, Unclipped) -->
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="user-menu-trigger w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs transition cursor-pointer shadow-sm group"
    >
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          class="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-red-800 border border-rose-500/40 overflow-hidden flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md shadow-rose-600/30"
        >
          <img
            v-if="currentUser.avatar"
            :src="currentUser.avatar"
            :alt="currentUser.name"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (currentUser.name || 'U')[0].toUpperCase() }}</span>
        </div>

        <div class="flex flex-col text-left min-w-0 flex-1">
          <div class="font-semibold text-white leading-tight flex items-center gap-1.5 min-w-0">
            <span class="truncate">{{ currentUser.name || 'User' }}</span>
            <span
              class="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-600/30 text-rose-300 font-extrabold uppercase border border-rose-500/50 shrink-0 shadow-sm"
            >
              {{ (currentUser.planId || 'starter').replace('plan-', '') }}
            </span>
          </div>
          <span class="text-[10px] text-zinc-400 leading-tight truncate">
            {{ currentUser.email }}
          </span>
        </div>
      </div>

      <icon-lucide-chevron-up
        v-if="direction === 'up'"
        class="size-3.5 text-zinc-400 shrink-0 transition-transform duration-200 group-hover:text-white"
        :class="{ 'rotate-180': isOpen }"
      />
      <icon-lucide-chevron-down
        v-else
        class="size-3.5 text-zinc-400 shrink-0 transition-transform duration-200 group-hover:text-white"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropup / Dropdown Menu (Opens Above in Sidebar so it never gets clipped) -->
    <div
      v-if="isOpen"
      class="user-menu-popover absolute w-72 rounded-2xl bg-zinc-900 border border-zinc-700/70 p-2.5 shadow-[0_-12px_36px_rgba(0,0,0,0.7)] z-50 text-xs space-y-2.5 divide-y divide-zinc-800 animate-scale-up"
      :class="
        direction === 'down'
          ? 'top-full mt-2 right-0'
          : 'bottom-full mb-2.5 left-0'
      "
    >
      <!-- Active Account Header -->
      <div class="p-1.5 space-y-2">
        <div class="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
          <span>Active Account</span>
          <span class="text-rose-400 font-extrabold">#{{ currentUser.waitlistNumber || '1' }}</span>
        </div>

        <div class="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-900 border border-rose-500/40 overflow-hidden flex items-center justify-center font-bold text-white shrink-0 shadow-md"
          >
            <img
              v-if="currentUser.avatar"
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ (currentUser.name || 'U')[0].toUpperCase() }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="font-bold text-white truncate text-sm">{{ currentUser.name }}</div>
            <div class="text-[11px] text-zinc-400 truncate">{{ currentUser.email }}</div>
          </div>
        </div>
      </div>

      <!-- Multi-account Switcher List (Only other accounts) -->
      <div v-if="accountsList.filter(a => a.id !== currentUser.id && a.email !== currentUser.email).length > 0" class="pt-2 px-1 space-y-1">
        <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1">
          Switch Account
        </div>

        <button
          v-for="acc in accountsList.filter(a => a.id !== currentUser.id && a.email !== currentUser.email)"
          :key="acc.id"
          @click="handleSwitchAccount(acc.id)"
          class="w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-[10px] shrink-0"
            >
              <img
                v-if="acc.avatar"
                :src="acc.avatar"
                :alt="acc.name"
                class="w-full h-full object-cover"
              />
              <span v-else>{{ (acc.name || 'U')[0].toUpperCase() }}</span>
            </div>
            <div class="truncate">
              <div class="truncate text-xs font-medium">{{ acc.name }}</div>
              <div class="text-[10px] text-zinc-400 truncate">{{ acc.email }}</div>
            </div>
          </div>
        </button>
      </div>

      <!-- Actions -->
      <div class="pt-2 px-1 space-y-1">
        <button
          @click="handleOpenProfile"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
        >
          <icon-lucide-settings class="size-4 text-rose-400" />
          <span class="font-medium">User & Profile Settings</span>
        </button>

        <button
          @click="handleAddAccount"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
        >
          <icon-lucide-user-plus class="size-4 text-zinc-400" />
          <span class="font-medium">Add Another Account</span>
        </button>

        <button
          @click="() => { isOpen = false; router.push('/setup') }"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
        >
          <icon-lucide-sliders-horizontal class="size-4 text-rose-400" />
          <span class="font-medium">Studio Setup Wizard</span>
        </button>

        <button
          v-if="currentUser.role === 'admin' || currentUser.email.toLowerCase().includes('admin')"
          @click="handleGoAdmin"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
        >
          <icon-lucide-shield-check class="size-4 text-rose-400" />
          <span class="font-medium">Admin Portal</span>
        </button>

        <button
          @click="handleSignOut"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600/30 border border-rose-500/30 font-semibold transition cursor-pointer mt-1"
        >
          <icon-lucide-log-out class="size-4 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  </div>
</template>
