<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createLocalProfile,
  listLocalProfiles,
  setActiveProfile
} from '@/app/dashboard/accounts/session'

const router = useRouter()
const profiles = ref(listLocalProfiles())
const profileName = ref('')
const error = ref('')

function openProfile(profileId: string) {
  setActiveProfile(profileId)
  void router.replace('/')
}

function createProfile() {
  try {
    const profile = createLocalProfile(profileName.value)
    openProfile(profile.id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not create the profile'
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center bg-[#09090b] p-6 text-[#fafafa]">
    <section
      class="w-full max-w-md rounded-2xl border border-[#27272a] bg-[#111113] p-7 shadow-2xl space-y-5"
    >
      <div class="flex items-center gap-3 border-b border-white/10 pb-4">
        <img src="/nexus-logo.webp" alt="Nexus Design Studios" class="h-10 w-auto rounded-lg" />
        <div>
          <h1 class="text-xl font-bold tracking-tight text-[#fafafa]">NexDesign</h1>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            Powered by Nexus Design Studios
          </p>
        </div>
      </div>

      <p class="text-sm leading-6 text-[#a1a1aa]">
        Choose a local profile. Your projects stay on this computer and save automatically.
      </p>

      <div v-if="profiles.length" class="space-y-2 pt-2">
        <p class="text-xs font-medium uppercase tracking-wider text-[#71717a]">Existing Profiles</p>
        <button
          v-for="profile in profiles"
          :key="profile.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border border-[#27272a] px-4 py-3 text-left transition hover:border-[#52525b] hover:bg-[#18181b]"
          @click="openProfile(profile.id)"
        >
          <span
            class="flex size-9 items-center justify-center rounded-full bg-rose-600 text-sm font-semibold text-white shadow-lg shadow-rose-600/30"
          >
            {{ profile.name.slice(0, 1).toUpperCase() }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ profile.name }}</span>
          <icon-lucide-chevron-right class="size-4 text-[#71717a]" />
        </button>
      </div>

      <form class="pt-2" @submit.prevent="createProfile">
        <label for="profile-name" class="text-xs font-medium text-[#d4d4d8]">
          {{ profiles.length ? 'Add another profile' : 'Create your local profile' }}
        </label>
        <div class="mt-2 flex gap-2">
          <input
            id="profile-name"
            v-model="profileName"
            autofocus
            autocomplete="name"
            placeholder="Your name (e.g. Alex)"
            class="min-w-0 flex-1 rounded-xl border border-[#3f3f46] bg-[#09090b] px-3.5 py-2.5 text-sm outline-none placeholder:text-[#52525b] focus:border-rose-500 transition"
          />
          <button
            type="submit"
            class="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/25"
          >
            Continue
          </button>
        </div>
        <p v-if="error" class="mt-2 text-xs text-rose-400">{{ error }}</p>
      </form>

      <div class="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-[#71717a]">
        <span class="flex items-center gap-1.5">
          <icon-lucide-hard-drive class="size-3.5 text-rose-400" />
          Local-only workspace profile
        </span>
        <span class="text-[10px] text-[#52525b]">Nexus Engine v0.11.8</span>
      </div>
    </section>
  </main>
</template>
