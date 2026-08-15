<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/app/auth/store'

const { currentUser, isProfileModalOpen, closeProfileModal, updateProfile } = useAuthStore()

const name = ref(currentUser.value.name)
const avatar = ref(currentUser.value.avatar || '')
const isSaved = ref(false)

watch(
  currentUser,
  (user) => {
    if (user) {
      name.value = user.name
      avatar.value = user.avatar || ''
    }
  },
  { immediate: true }
)

function handleSave() {
  updateProfile({
    name: name.value.trim(),
    avatar: avatar.value.trim() || undefined
  })
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
    closeProfileModal()
  }, 1000)
}
</script>

<template>
  <div v-if="isProfileModalOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-6 shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-violet-300">
            <img v-if="avatar" :src="avatar" :alt="name" class="w-full h-full object-cover" />
            <span v-else>{{ name[0] }}</span>
          </div>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              {{ currentUser.name }}
              <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-violet-600/20 text-violet-300 border border-violet-500/30">
                {{ currentUser.planId.replace('plan-', '') }}
              </span>
            </h3>
            <p class="text-xs text-zinc-400">{{ currentUser.email }}</p>
          </div>
        </div>

        <button @click="closeProfileModal" class="text-zinc-400 hover:text-white">✕</button>
      </div>

      <!-- Settings Form -->
      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Display Name</label>
          <input
            v-model="name"
            type="text"
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label class="block text-zinc-400 mb-1 font-medium">Avatar Image URL</label>
          <input
            v-model="avatar"
            type="text"
            placeholder="https://images.unsplash.com/..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div class="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
          <div class="flex items-center justify-between text-zinc-400">
            <span>Account Role:</span>
            <span class="font-bold text-white uppercase">{{ currentUser.role }}</span>
          </div>
          <div class="flex items-center justify-between text-zinc-400">
            <span>Email Verification:</span>
            <span class="font-bold text-emerald-400">Verified</span>
          </div>
          <div class="flex items-center justify-between text-zinc-400">
            <span>Account ID:</span>
            <span class="font-mono text-zinc-500 text-[10px]">{{ currentUser.id }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-white/10">
        <span v-if="isSaved" class="text-xs text-emerald-400 font-semibold">✓ Profile Saved</span>
        <span v-else></span>

        <div class="flex items-center gap-3">
          <button @click="closeProfileModal" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300">
            Cancel
          </button>
          <button @click="handleSave" class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
