<script setup lang="ts">
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const { networkToast, dismissNetworkToast } = useNetworkStatus()
</script>

<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="networkToast"
      class="fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-start gap-3 transition"
      :class="{
        'bg-amber-950/90 border-amber-500/30 text-amber-200 shadow-amber-950/50': networkToast.type === 'offline',
        'bg-indigo-950/90 border-indigo-500/30 text-indigo-200 shadow-indigo-950/50': networkToast.type === 'online_syncing',
        'bg-emerald-950/90 border-emerald-500/30 text-emerald-200 shadow-emerald-950/50': networkToast.type === 'online_synced'
      }"
    >
      <div class="mt-0.5 shrink-0">
        <span v-if="networkToast.type === 'offline'" class="w-3 h-3 rounded-full bg-amber-400 block animate-pulse"></span>
        <span v-else-if="networkToast.type === 'online_syncing'" class="w-3 h-3 rounded-full bg-indigo-400 block animate-ping"></span>
        <span v-else class="w-3 h-3 rounded-full bg-emerald-400 block"></span>
      </div>

      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold tracking-wide flex items-center justify-between">
          <span>{{ networkToast.title }}</span>
          <span class="text-[10px] opacity-60 font-mono">Just now</span>
        </div>
        <div class="text-[11px] opacity-90 mt-0.5 leading-snug">
          {{ networkToast.message }}
        </div>
      </div>

      <button
        @click="dismissNetworkToast"
        class="text-xs opacity-60 hover:opacity-100 p-1 rounded-md transition"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>
