<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '@/app/auth/store'

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

function handleSignOut(userId: string) {
  isOpen.value = false
  signOut(userId)
}
</script>

<template>
  <div ref="menuRef" class="relative">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/10 text-xs transition"
    >
      <div class="w-7 h-7 rounded-full bg-rose-600/30 border border-rose-500/40 overflow-hidden flex items-center justify-center font-bold text-rose-300 text-xs shrink-0">
        <img v-if="currentUser.avatar" :src="currentUser.avatar" :alt="currentUser.name" class="w-full h-full object-cover" />
        <span v-else>{{ currentUser.name[0] }}</span>
      </div>

      <div class="hidden sm:flex flex-col text-left">
        <span class="font-semibold text-white leading-tight flex items-center gap-1.5">
          {{ currentUser.name }}
          <span class="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-extrabold uppercase border border-rose-500/30">
            {{ currentUser.planId.replace('plan-', '') }}
          </span>
        </span>
        <span class="text-[10px] text-zinc-400 leading-tight truncate max-w-[110px]">{{ currentUser.email }}</span>
      </div>

      <svg class="w-3.5 h-3.5 text-zinc-400 ml-1 transition" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Figma-style Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-2 shadow-2xl z-50 text-xs space-y-2 divide-y divide-white/5"
    >
      <!-- Active Account Header -->
      <div class="p-2 space-y-2">
        <div class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">
          Active Account
        </div>

        <div class="flex items-center gap-3 p-2 rounded-xl bg-zinc-950/60 border border-white/5">
          <div class="w-9 h-9 rounded-full bg-rose-600/30 border border-rose-500/30 overflow-hidden flex items-center justify-center font-bold text-rose-300 shrink-0">
            <img v-if="currentUser.avatar" :src="currentUser.avatar" :alt="currentUser.name" class="w-full h-full object-cover" />
            <span v-else>{{ currentUser.name[0] }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="font-bold text-white truncate">{{ currentUser.name }}</div>
            <div class="text-[11px] text-zinc-400 truncate">{{ currentUser.email }}</div>
          </div>
        </div>
      </div>

      <!-- Multi-account Switcher List -->
      <div v-if="accountsList.length > 1" class="p-2 space-y-1">
        <div class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-1">
          Switch Account
        </div>

        <button
          v-for="acc in accountsList"
          :key="acc.id"
          @click="handleSwitchAccount(acc.id)"
          class="w-full flex items-center justify-between p-2 rounded-xl text-left transition"
          :class="acc.id === currentUser.id ? 'bg-rose-600/10 text-rose-300 font-semibold border border-rose-500/20' : 'text-zinc-300 hover:bg-white/5'"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-[10px] shrink-0">
              <img v-if="acc.avatar" :src="acc.avatar" :alt="acc.name" class="w-full h-full object-cover" />
              <span v-else>{{ acc.name[0] }}</span>
            </div>
            <div class="truncate">
              <div class="truncate text-xs">{{ acc.name }}</div>
              <div class="text-[10px] text-zinc-400 truncate">{{ acc.email }}</div>
            </div>
          </div>

          <span v-if="acc.id === currentUser.id" class="text-rose-400 font-bold text-sm ml-2">✓</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="p-2 space-y-1">
        <button
          @click="handleAddAccount"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:bg-white/5 hover:text-white transition"
        >
          <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Another Account
        </button>

        <button
          @click="handleOpenProfile"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:bg-white/5 hover:text-white transition"
        >
          <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Account Settings
        </button>

        <button
          @click="handleGoAdmin"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:bg-rose-600/10 hover:text-rose-300 transition"
        >
          <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin Portal
        </button>

        <button
          @click="handleSignOut(currentUser.id)"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
        >
          <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>
