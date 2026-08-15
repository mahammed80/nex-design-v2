<script setup lang="ts">
import { ref } from 'vue'
import { useAdminStore } from '@/app/admin/store'
import type { PluginRecord, PluginCategory, PluginStatus } from '@/app/admin/types'
import PluginCreateModal from './PluginCreateModal.vue'
import PluginDetailModal from './PluginDetailModal.vue'

const {
  pluginSearchQuery,
  pluginCategoryFilter,
  pluginStatusFilter,
  pluginSortBy,
  filteredPlugins,
  togglePluginStatus
} = useAdminStore()

const isCreateModalOpen = ref(false)
const selectedPluginForDetail = ref<PluginRecord | null>(null)

const categories: { id: PluginCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'ai', label: 'AI Tools' },
  { id: 'vector', label: 'Vector & Graphics' },
  { id: 'layout', label: 'Layout & Grid' },
  { id: 'export', label: 'Export & Code' },
  { id: 'utility', label: 'Utilities' }
]

function openDetails(plugin: PluginRecord) {
  selectedPluginForDetail.value = plugin
}

function handleQuickToggle(plugin: PluginRecord) {
  const nextStatus: PluginStatus = plugin.status === 'disabled' ? 'published' : 'disabled'
  togglePluginStatus(plugin.id, nextStatus)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">Plugin Ecosystem Governance</h2>
        <p class="text-xs text-zinc-400 mt-1">Search, review, register, and manage marketplace extensions</p>
      </div>

      <button
        @click="isCreateModalOpen = true"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20 transition"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Register New Plugin
      </button>
    </div>

    <!-- Search & Filter Controls -->
    <div class="space-y-3">
      <div class="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
        <!-- Live Search Bar -->
        <div class="w-full md:w-96 relative">
          <svg class="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="pluginSearchQuery"
            type="text"
            placeholder="Search plugins by name, author, tag, or slug..."
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex items-center gap-3 w-full md:w-auto">
          <select
            v-model="pluginStatusFilter"
            class="px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="featured">Featured</option>
            <option value="draft">Draft</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            v-model="pluginSortBy"
            class="px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="popular">Sort: Most Popular</option>
            <option value="rating">Sort: Highest Rated</option>
            <option value="newest">Sort: Newest First</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="pluginCategoryFilter = cat.id"
          class="px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0"
          :class="[
            pluginCategoryFilter === cat.id
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5'
          ]"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Plugin Cards Grid -->
    <div v-if="filteredPlugins.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col justify-between group hover:border-violet-500/40 transition relative"
      >
        <div class="space-y-3">
          <!-- Top bar -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold shrink-0">
                <img v-if="plugin.iconUrl" :src="plugin.iconUrl" :alt="plugin.name" class="w-6 h-6 object-contain" />
                <span v-else>{{ plugin.name[0] }}</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                  {{ plugin.name }}
                  <span class="text-[10px] text-zinc-500 font-normal">v{{ plugin.version }}</span>
                </h3>
                <div class="text-[11px] text-zinc-400">by {{ plugin.author }}</div>
              </div>
            </div>

            <span
              class="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full shrink-0"
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

          <!-- Description -->
          <p class="text-xs text-zinc-300 line-clamp-2 min-h-[32px]">
            {{ plugin.description }}
          </p>

          <!-- Permissions tags -->
          <div class="flex flex-wrap gap-1 pt-1">
            <span
              v-for="perm in plugin.permissions.slice(0, 3)"
              :key="perm"
              class="px-2 py-0.5 rounded-md bg-zinc-950 text-[10px] font-mono text-zinc-400 border border-white/5"
            >
              {{ perm }}
            </span>
            <span v-if="plugin.permissions.length > 3" class="text-[10px] text-zinc-500">
              +{{ plugin.permissions.length - 3 }} more
            </span>
          </div>
        </div>

        <!-- Footer stats & actions -->
        <div class="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3 text-xs">
            <span class="text-zinc-400 font-medium">📥 {{ plugin.downloadsCount.toLocaleString() }}</span>
            <span class="text-amber-400 font-semibold">★ {{ plugin.rating }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleQuickToggle(plugin)"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition"
              :class="plugin.status === 'disabled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'"
            >
              {{ plugin.status === 'disabled' ? 'Enable' : 'Disable' }}
            </button>
            <button
              @click="openDetails(plugin)"
              class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[11px] font-medium transition"
            >
              Inspect
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
      <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500 text-xl">
        🔍
      </div>
      <h3 class="text-sm font-semibold text-white">No plugins match your filters</h3>
      <p class="text-xs text-zinc-400 max-w-sm mx-auto">
        Try adjusting your search query or switching categories.
      </p>
    </div>

    <!-- CREATE MODAL -->
    <PluginCreateModal
      v-if="isCreateModalOpen"
      @close="isCreateModalOpen = false"
    />

    <!-- DETAIL MODAL -->
    <PluginDetailModal
      v-if="selectedPluginForDetail"
      :plugin="selectedPluginForDetail"
      @close="selectedPluginForDetail = null"
    />
  </div>
</template>
