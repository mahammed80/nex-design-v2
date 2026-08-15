<script setup lang="ts">
import { ref } from 'vue'
import { useAdminStore } from '@/app/admin/store'
import type { PluginCategory, PluginStatus } from '@/app/admin/types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { createPlugin } = useAdminStore()

const name = ref('')
const slug = ref('')
const author = ref('')
const category = ref<PluginCategory>('ai')
const version = ref('1.0.0')
const status = ref<PluginStatus>('published')
const description = ref('')
const iconUrl = ref('')
const scriptUrl = ref('')

// Available permissions options
const availablePermissions = [
  { id: 'scene:read', label: 'Read Scene Graph' },
  { id: 'scene:write', label: 'Modify Scene Nodes' },
  { id: 'network:fetch', label: 'Make Network Requests' },
  { id: 'ui:dialog', label: 'Show Custom UI Dialogs' },
  { id: 'ai:prompt', label: 'Access AI Co-pilot Engine' },
  { id: 'clipboard:write', label: 'Write to Clipboard' }
]

const selectedPermissions = ref<string[]>(['scene:read', 'scene:write'])

function generateSlug() {
  slug.value = name.value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function handleNameChange() {
  if (!slug.value || slug.value === name.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
    generateSlug()
  }
}

function togglePermission(permId: string) {
  if (selectedPermissions.value.includes(permId)) {
    selectedPermissions.value = selectedPermissions.value.filter((p) => p !== permId)
  } else {
    selectedPermissions.value.push(permId)
  }
}

function submitForm() {
  if (!name.value.trim() || !author.value.trim()) return

  const manifestObject = {
    name: name.value.trim(),
    id: slug.value || name.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    api: '1.0.0',
    version: version.value,
    main: scriptUrl.value ? scriptUrl.value : 'dist/index.js',
    permissions: selectedPermissions.value
  }

  createPlugin({
    name: name.value.trim(),
    slug: slug.value || name.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    author: author.value.trim(),
    category: category.value,
    version: version.value,
    status: status.value,
    description: description.value.trim(),
    iconUrl: iconUrl.value.trim() || undefined,
    scriptUrl: scriptUrl.value.trim() || undefined,
    manifestJson: JSON.stringify(manifestObject, null, 2),
    permissions: selectedPermissions.value
  })

  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-5 max-h-[90vh] flex flex-col justify-between">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 class="text-base font-bold text-white">Publish New Marketplace Plugin</h3>
          <p class="text-xs text-zinc-400">Register a new extension or tool for the NexDesign ecosystem</p>
        </div>
        <button @click="$emit('close')" class="text-zinc-400 hover:text-white text-lg">✕</button>
      </div>

      <!-- Modal Body -->
      <div class="space-y-4 overflow-y-auto pr-1 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Plugin Name *</label>
            <input
              v-model="name"
              @input="handleNameChange"
              type="text"
              placeholder="e.g. Color Palette AI"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Slug / Unique ID</label>
            <input
              v-model="slug"
              type="text"
              placeholder="color-palette-ai"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Author / Publisher *</label>
            <input
              v-model="author"
              type="text"
              placeholder="e.g. Studio Labs"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Category</label>
            <select
              v-model="category"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ai">AI Tools</option>
              <option value="vector">Vector & Graphics</option>
              <option value="layout">Layout & Grid</option>
              <option value="export">Export & Code</option>
              <option value="utility">Workflow & Utility</option>
            </select>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Version</label>
            <input
              v-model="version"
              type="text"
              placeholder="1.0.0"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Short Description</label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="Explain what your plugin does in 1-2 sentences..."
            class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Icon URL (SVG / PNG)</label>
            <input
              v-model="iconUrl"
              type="text"
              placeholder="https://..."
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label class="block text-zinc-400 mb-1 font-medium">Script Entry URL</label>
            <input
              v-model="scriptUrl"
              type="text"
              placeholder="https://cdn.example.com/plugin.js"
              class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <!-- Permissions selector -->
        <div>
          <label class="block text-zinc-400 mb-2 font-medium">Required Permissions</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="perm in availablePermissions"
              :key="perm.id"
              @click="togglePermission(perm.id)"
              class="p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition"
              :class="selectedPermissions.includes(perm.id) ? 'bg-violet-600/10 border-violet-500/40 text-violet-300' : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'"
            >
              <span>{{ perm.label }}</span>
              <span class="text-[10px] font-mono text-zinc-500">{{ perm.id }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
        <button
          @click="$emit('close')"
          class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
        >
          Cancel
        </button>
        <button
          @click="submitForm"
          class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition"
        >
          Publish Plugin
        </button>
      </div>
    </div>
  </div>
</template>
