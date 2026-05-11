<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { TooltipProvider } from 'reka-ui'

import { provideEditor, useI18n } from '@nex-design/vue'
import AppToast from '@/components/AppToast.vue'
import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import { useAppTheme } from '@/app/shell/theme'
import { scheduleStartupUpdateCheck } from '@/app/shell/updater'

useHead({ titleTemplate: (title) => (title ? `${title} — NexDesign` : 'NexDesign') })

const store = useEditorStore()
const { dialogs } = useI18n()
provideEditor(store)
useAppTheme()

onMounted(() => {
  toast.setupGlobalErrorHandler()
  scheduleStartupUpdateCheck(dialogs)
})
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <RouterView />
    <AppToast />
  </TooltipProvider>
</template>
