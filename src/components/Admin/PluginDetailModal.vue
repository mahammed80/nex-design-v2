<script setup lang="ts">
import { useAdminStore } from '@/app/admin/store'
import type { PluginRecord, PluginStatus } from '@/app/admin/types'

const { plugin } = defineProps<{
  plugin: PluginRecord
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { togglePluginStatus, deletePlugin } = useAdminStore()

function handleStatusChange(status: PluginStatus) {
  togglePluginStatus(plugin.id, status)
}

function handleDelete() {
  deletePlugin(plugin.id)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-xl rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-5">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold">
            <img v-if="plugin.iconUrl" :src="plugin.iconUrl" :alt="plugin.name" class="w-6 h-6 object-contain" />
            <span v-else>{{ plugin.name[0] }}</span>
          </div>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              {{ plugin.name }}
              <span class="text-xs text-zinc-500 font-normal">v{{ plugin.version }}</span>
            </h3>
            <p class="text-xs text-zinc-400">Published by {{ plugin.author }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="text-zinc-400 hover:text-white">✕</button>
      </div>

      <!-- Details Body -->
      <div class="space-y-4 text-xs">
        <div>
          <span class="text-zinc-400 block mb-1">Description</span>
          <p class="text-zinc-200 bg-zinc-950 p-3 rounded-xl border border-white/5">
            {{ plugin.description }}
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="p-3 rounded-xl bg-zinc-950 border border-white/5">
            <span class="text-zinc-500 block text-[10px] uppercase font-semibold">Installs</span>
            <span class="text-white font-bold text-sm">{{ plugin.downloadsCount.toLocaleString() }}</span>
          </div>
          <div class="p-3 rounded-xl bg-zinc-950 border border-white/5">
            <span class="text-zinc-500 block text-[10px] uppercase font-semibold">Rating</span>
            <span class="text-amber-400 font-bold text-sm">★ {{ plugin.rating }}</span>
          </div>
          <div class="p-3 rounded-xl bg-zinc-950 border border-white/5">
            <span class="text-zinc-500 block text-[10px] uppercase font-semibold">Category</span>
            <span class="text-violet-300 font-bold uppercase text-[11px]">{{ plugin.category }}</span>
          </div>
        </div>

        <div>
          <span class="text-zinc-400 block mb-1">Permissions Required</span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="perm in plugin.permissions"
              :key="perm"
              class="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-mono"
            >
              {{ perm }}
            </span>
          </div>
        </div>

        <div>
          <span class="text-zinc-400 block mb-1">Manifest JSON</span>
          <pre class="bg-zinc-950 p-3 rounded-xl border border-white/5 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36">{{ plugin.manifestJson }}</pre>
        </div>

        <!-- Status Controller -->
        <div class="pt-2 flex items-center justify-between border-t border-white/10">
          <div class="flex items-center gap-2">
            <span class="text-zinc-400">Current Status:</span>
            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              :class="{
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': plugin.status === 'published',
                'bg-violet-500/10 text-violet-400 border border-violet-500/20': plugin.status === 'featured',
                'bg-zinc-800 text-zinc-400': plugin.status === 'draft',
                'bg-rose-500/10 text-rose-400 border border-rose-500/20': plugin.status === 'disabled'
              }"
            >
              {{ plugin.status }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleStatusChange('featured')"
              class="px-3 py-1 rounded-lg text-xs font-medium bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30"
            >
              Feature
            </button>
            <button
              @click="handleStatusChange(plugin.status === 'disabled' ? 'published' : 'disabled')"
              class="px-3 py-1 rounded-lg text-xs font-medium border transition"
              :class="plugin.status === 'disabled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'"
            >
              {{ plugin.status === 'disabled' ? 'Enable Plugin' : 'Disable Plugin' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          @click="handleDelete"
          class="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold"
        >
          Delete Plugin
        </button>
        <button
          @click="$emit('close')"
          class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
