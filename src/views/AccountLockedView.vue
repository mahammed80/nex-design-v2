<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resolveAccountAccess } from '@/app/dashboard/accounts/guard'
import { clearLinkedAccountSession } from '@/app/dashboard/accounts/access'
import { signOutLocalProfile } from '@/app/dashboard/accounts/session'

const route = useRoute()
const router = useRouter()
const checking = ref(false)
const reason = computed(() => String(route.query.reason ?? 'deactivated'))
const message = computed(() => {
  if (reason.value === 'lease-expired')
    return 'Connect to the internet so this device can validate your account.'
  if (reason.value === 'suspended')
    return 'This account is suspended. Contact support or use another account.'
  if (reason.value === 'deleted') return 'This account is no longer available.'
  return 'This account was deactivated online. Your local projects remain on this computer.'
})

async function checkAgain() {
  checking.value = true
  const access = await resolveAccountAccess()
  checking.value = false
  if (access.mode === 'full' || access.mode === 'offline') await router.replace('/')
  else await router.replace({ path: '/account-locked', query: { reason: access.reason } })
}

async function useAnotherAccount() {
  clearLinkedAccountSession()
  signOutLocalProfile()
  await router.replace('/login')
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[#09090b] p-6 text-[#fafafa]">
    <section
      class="w-full max-w-md rounded-2xl border border-[#27272a] bg-[#111113] p-7 shadow-2xl"
    >
      <div
        class="flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-400"
      >
        <icon-lucide-lock-keyhole class="size-5" />
      </div>
      <h1 class="mt-5 text-2xl font-semibold">Account access is locked</h1>
      <p class="mt-2 text-sm leading-6 text-[#a1a1aa]">{{ message }}</p>
      <p class="mt-5 rounded-lg border border-[#27272a] bg-[#09090b] p-3 text-xs text-[#a1a1aa]">
        NexDesign does not delete local project files when an account is blocked.
      </p>
      <div class="mt-6 flex gap-2">
        <button
          type="button"
          :disabled="checking"
          class="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          @click="checkAgain"
        >
          {{ checking ? 'Checking…' : 'Check account status' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-[#3f3f46] px-4 py-2.5 text-sm"
          @click="useAnotherAccount"
        >
          Use another account
        </button>
      </div>
    </section>
  </main>
</template>
