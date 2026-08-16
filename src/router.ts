import { createRouter, createWebHistory } from 'vue-router'

import { resolveAccountAccess } from './app/dashboard/accounts/guard'
import { getActiveProfileId, migrateLegacyLocalProfile } from './app/dashboard/accounts/session'
import AccountLockedView from './views/AccountLockedView.vue'
import DashboardView from './views/DashboardView.vue'
import AdminDashboardView from './views/AdminDashboardView.vue'
import EditorView from './views/EditorView.vue'
import LandingView from './views/LandingView.vue'
import LoginView from './views/LoginView.vue'
import SetupView from './views/SetupView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/setup', component: SetupView },
    { path: '/admin', component: AdminDashboardView },
    { path: '/login', component: LoginView },
    { path: '/account-locked', component: AccountLockedView },
    { path: '/landing', component: LandingView },
    { path: '/editor', component: EditorView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView }
  ]
})

let isInitialLoad = true

router.beforeEach(async (to) => {
  migrateLegacyLocalProfile()
  const isPublicRoute =
    to.path === '/login' ||
    to.path === '/landing' ||
    to.path === '/setup' ||
    to.path === '/account-locked' ||
    to.path.startsWith('/share/')
  if (!isPublicRoute && !getActiveProfileId()) return '/login'
  if (to.path === '/login' && getActiveProfileId()) return '/'
  const access = await resolveAccountAccess()
  if (!isPublicRoute && (access.mode === 'blocked' || access.mode === 'read-only')) {
    return { path: '/account-locked', query: { reason: access.reason } }
  }
  if (to.path === '/account-locked' && (access.mode === 'full' || access.mode === 'offline')) {
    return getActiveProfileId() ? '/' : '/login'
  }
  if (to.path === '/editor' && isInitialLoad) {
    isInitialLoad = false
    return '/'
  }
  isInitialLoad = false
})

export default router
