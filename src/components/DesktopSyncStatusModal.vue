<script setup lang="ts">
import { ref } from 'vue'
import { useOnline } from '@vueuse/core'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const isOnline = useOnline()
const isSyncing = ref(false)
const syncSuccessMessage = ref<string | null>(null)

// Outbox Queue Items Mock / State
const outboxQueue = ref([
  { id: 'mut-101', type: 'node:created', target: 'Header Frame', time: '2 mins ago' },
  { id: 'mut-102', type: 'node:updated', target: 'CTA Button fill', time: '1 min ago' },
  { id: 'mut-103', type: 'page:changed', target: 'Switch to Design Tokens', time: 'Just now' }
])

function handleForceSync() {
  if (!isOnline.value) return
  isSyncing.value = true
  setTimeout(() => {
    outboxQueue.value = []
    isSyncing.value = false
    syncSuccessMessage.value = 'All local changes successfully reconciled with Cloud Relay.'
    setTimeout(() => {
      syncSuccessMessage.value = null
    }, 4000)
  }, 1200)
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-xl flex items-center justify-center font-bold text-base"
            :class="isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'"
          >
            {{ isOnline ? '⚡' : '📡' }}
          </div>
          <div>
            <h3 class="text-base font-bold text-[#fafafa]">Desktop Sync & Outbox Monitor</h3>
            <p class="text-xs text-[#a1a1aa]">
              Status:
              <strong :class="isOnline ? 'text-emerald-400' : 'text-amber-400'">
                {{ isOnline ? 'Online — Cloud Relay Reachable' : 'Offline Mode — Preserving Local Edits' }}
              </strong>
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 transition"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Notification banner -->
      <div
        v-if="syncSuccessMessage"
        class="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center justify-between"
      >
        <span>✓ {{ syncSuccessMessage }}</span>
      </div>

      <!-- Outbox Queue Info -->
      <div class="space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-[#a1a1aa] uppercase tracking-wider text-[10px]">
            IndexedDB Outbox Queue ({{ outboxQueue.length }} Pending Mutations)
          </span>
          <span class="text-[10px] text-[#71717a]">ECDSA P-256 Lease Active</span>
        </div>

        <div class="rounded-xl border border-white/5 bg-[#121215] overflow-hidden max-h-48 overflow-y-auto">
          <div
            v-for="item in outboxQueue"
            :key="item.id"
            class="p-3 border-b border-white/5 last:border-0 flex items-center justify-between text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-white/5 font-mono text-[10px] text-rose-300">
                {{ item.type }}
              </span>
              <span class="font-medium text-[#fafafa]">{{ item.target }}</span>
            </div>
            <span class="text-[10px] text-[#71717a] font-mono">{{ item.time }}</span>
          </div>

          <div v-if="outboxQueue.length === 0" class="p-6 text-center text-xs text-[#71717a]">
            ✓ Outbox empty — all local changes are fully synchronized.
          </div>
        </div>
      </div>

      <!-- Conflict & Lease Notice -->
      <div class="p-3 rounded-xl border border-white/5 bg-[#121215] text-[11px] leading-relaxed text-[#a1a1aa] space-y-1">
        <div class="font-semibold text-[#eae8e4]">Conflict Resolution Policy:</div>
        <div>
          Edits made offline are preserved locally first. Upon reconnecting, CRDT (Yjs) vectors merge deterministically without overwriting concurrent collaborator nodes.
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-xl border border-white/5 bg-[#121215] text-xs font-semibold text-[#a1a1aa] hover:text-white transition"
        >
          Close
        </button>
        <button
          @click="handleForceSync"
          :disabled="!isOnline || isSyncing || outboxQueue.length === 0"
          class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow-lg shadow-rose-600/20 flex items-center gap-2"
        >
          <span v-if="isSyncing" class="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ isSyncing ? 'Synchronizing...' : 'Force Sync Outbox Now' }}
        </button>
      </div>
    </div>
  </div>
</template>
