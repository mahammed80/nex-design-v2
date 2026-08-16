<script setup lang="ts">
import type { DashboardView } from '@/app/dashboard/projects/use'

defineProps<{
  accounts: string[]
  activeAccount: string
  activeView: DashboardView
}>()

defineEmits<{
  addAccount: []
  changeView: [view: DashboardView]
  openSettings: []
  signOut: []
  switchAccount: [name: string]
}>()

const navigation = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'recents', label: 'Recents', icon: 'history' },
  { view: 'starred', label: 'Starred', icon: 'star' },
  { view: 'projects', label: 'Projects', icon: 'folder' }
] as const
</script>

<template>
  <aside
    class="w-64 border-r border-white/5 bg-[#0e0e11] flex flex-col justify-between shrink-0 select-none"
  >
    <div class="flex flex-col py-6">
      <div class="px-6 mb-8 select-none">
        <img
          src="/logo.png"
          class="h-8 w-auto invert object-contain opacity-90 hover:opacity-100 transition-opacity"
          alt="NexDesign"
        />
      </div>

      <nav class="px-3 space-y-1" aria-label="Dashboard">
        <button
          v-for="item in navigation"
          :key="item.view"
          type="button"
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
          :class="[
            activeView === item.view
              ? 'bg-white/5 text-[#fafafa] font-semibold'
              : 'text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa]'
          ]"
          @click="$emit('changeView', item.view)"
        >
          <icon-lucide-home v-if="item.icon === 'home'" class="size-4 shrink-0" />
          <icon-lucide-history v-else-if="item.icon === 'history'" class="size-4 shrink-0" />
          <icon-lucide-star v-else-if="item.icon === 'star'" class="size-4 shrink-0" />
          <icon-lucide-folder v-else class="size-4 shrink-0" />
          {{ item.label }}
        </button>
      </nav>

      <div class="h-px bg-white/5 my-6 mx-4" />
      <div class="px-6 text-[10px] font-semibold text-[#52525b] uppercase tracking-widest mb-3">
        Workspace
      </div>
      <div class="px-3">
        <button
          type="button"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
          @click="$emit('changeView', 'projects')"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-accent" />
          My Projects
        </button>
      </div>
    </div>

    <div class="p-3 space-y-1">
      <button
        type="button"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
        @click="$emit('openSettings')"
      >
        <icon-lucide-user-round class="size-4" />
        Profile
      </button>
      <a
        href="https://github.com/mahammed80/nex-design-v2"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#a1a1aa] hover:bg-white/[0.02] hover:text-[#fafafa] transition-all duration-200"
      >
        <icon-lucide-help-circle class="size-4" />
        Help
      </a>

      <div class="border-t border-white/5 pt-3 mt-3 px-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-7 h-7 rounded-full bg-accent/20 border border-accent/35 flex items-center justify-center font-bold text-accent text-xs shrink-0 uppercase"
              aria-hidden="true"
            >
              {{ activeAccount[0] }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[11px] font-bold text-[#fafafa] truncate leading-tight">
                {{ activeAccount }}
              </div>
              <div class="text-[9px] text-[#71717a] leading-none">Active Profile</div>
            </div>
          </div>

          <div class="relative group/account">
            <button
              type="button"
              aria-label="Manage accounts"
              class="size-6 rounded hover:bg-white/5 text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors"
            >
              <icon-lucide-more-vertical class="size-3.5" />
            </button>
            <div
              class="absolute bottom-full left-0 mb-1.5 w-44 rounded-lg border border-white/5 bg-[#121215] p-1 shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/account:opacity-100 group-hover/account:translate-y-0 group-hover/account:pointer-events-auto transition-all duration-150 z-50 before:absolute before:inset-x-0 before:h-2 before:top-full"
            >
              <div
                class="px-2 py-1 text-[9px] font-semibold text-[#52525b] uppercase tracking-wider border-b border-white/5 mb-1"
              >
                Accounts
              </div>
              <button
                v-for="account in accounts.filter((name) => name !== activeAccount)"
                :key="account"
                type="button"
                class="w-full text-left px-2 py-1.5 rounded text-[11px] text-[#a1a1aa] hover:bg-white/5 hover:text-white transition-colors truncate"
                @click="$emit('switchAccount', account)"
              >
                {{ account }}
              </button>
              <button
                type="button"
                class="w-full text-left px-2 py-1.5 rounded text-[11px] text-accent hover:bg-accent/10 transition-colors flex items-center gap-1.5"
                @click="$emit('addAccount')"
              >
                <icon-lucide-plus class="size-3" /> Add Account
              </button>
              <button
                type="button"
                class="w-full text-left px-2 py-1.5 rounded text-[11px] text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5 mt-1 pt-1.5 flex items-center gap-1.5"
                @click="$emit('signOut')"
              >
                <icon-lucide-log-out class="size-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
