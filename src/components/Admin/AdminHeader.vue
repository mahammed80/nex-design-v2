<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/app/admin/store'
import UserMenu from '@/components/Auth/UserMenu.vue'

const router = useRouter()
const { stats } = useAdminStore()

function goToWorkspace() {
  router.push('/')
}
</script>

<template>
  <header class="h-16 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <img src="/nexus-logo.webp" alt="Nexus Design Studios" class="h-9 w-auto rounded-lg" />
        <div>
          <h1 class="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            NexDesign Admin Portal
            <span class="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              v0.11.8
            </span>
          </h1>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-400/90">
            Powered by Nexus Design Studios
          </p>
        </div>
      </div>
    </div>

    <!-- Quick stats badge & user menu -->
    <div class="flex items-center gap-4">
      <div class="hidden md:flex items-center gap-6 px-4 py-1.5 rounded-lg bg-zinc-900/90 border border-white/5 text-xs text-zinc-300">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-zinc-400">MRR:</span>
          <span class="font-semibold text-emerald-400">${{ stats.mrr.toLocaleString() }}</span>
        </div>
        <div class="w-px h-3 bg-white/10"></div>
        <div>
          <span class="text-zinc-400">Subscribers:</span>
          <span class="font-semibold text-white ml-1.5">{{ stats.activeSubscribers }}</span>
        </div>
        <div class="w-px h-3 bg-white/10"></div>
        <div>
          <span class="text-zinc-400">Plugins:</span>
          <span class="font-semibold text-rose-400 ml-1.5">{{ stats.activePlugins }}</span>
        </div>
      </div>

      <button
        @click="goToWorkspace"
        class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white transition"
      >
        <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Workspace
      </button>

      <UserMenu />
    </div>
  </header>
</template>
