import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'

import './app.css'
import { preloadFonts } from '@/app/editor/fonts'
import { IS_TAURI } from '@/constants'
import { migrateLegacyLocalProfile } from '@/app/dashboard/accounts/session'

import App from './App.vue'
import router from './router'
import { vReveal } from '@/directives/reveal'

// Run once at startup — not on every navigation guard.
migrateLegacyLocalProfile()
preloadFonts()
const head = createHead()
const app = createApp(App)
app.directive('reveal', vReveal)
app.use(router).use(head).mount('#app')

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

