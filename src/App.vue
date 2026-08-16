<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { TooltipProvider } from 'reka-ui'

import { provideEditor, useI18n } from '@nex-design/vue'
import AppToast from '@/components/AppToast.vue'
import NetworkToast from '@/components/NetworkToast.vue'
import AuthModal from '@/components/Auth/AuthModal.vue'
import AccountProfileModal from '@/components/Auth/AccountProfileModal.vue'
import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import { useAppTheme } from '@/app/shell/theme'
import { scheduleStartupUpdateCheck } from '@/app/shell/updater'
import { useEventListener } from '@vueuse/core'
import { validateLinkedAccount } from '@/app/dashboard/accounts/api'
import { flushProjectSyncOutbox } from '@/app/dashboard/sync/client'

useHead({ titleTemplate: (title) => (title ? `${title} — NexDesign` : 'NexDesign') })

const store = useEditorStore()
const { dialogs } = useI18n()
provideEditor(store)
useAppTheme()

onMounted(() => {
  toast.setupGlobalErrorHandler()
  scheduleStartupUpdateCheck(dialogs)
  void validateLinkedAccount()
    .then(() => flushProjectSyncOutbox())
    .catch((error: unknown) => console.warn('Account startup validation failed', error))
})

useEventListener(window, 'online', () => {
  void validateLinkedAccount()
    .then(() => flushProjectSyncOutbox())
    .catch((error: unknown) => console.warn('Account reconnection validation failed', error))
})
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <RouterView />
    <AppToast />
    <NetworkToast />
    <AuthModal />
    <AccountProfileModal />
  </TooltipProvider>
</template>
