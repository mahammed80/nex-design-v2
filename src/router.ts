import { createRouter, createWebHistory } from 'vue-router'

import { resolveAccountAccess } from './app/dashboard/accounts/guard'
import { getActiveProfileId } from './app/dashboard/accounts/session'

// All route components are loaded lazily so only the first-visited view's
// code is parsed at startup — significantly improving initial load time.
const AccountLockedView = () => import('./views/AccountLockedView.vue')
const DashboardView = () => import('./views/DashboardView.vue')
const AdminDashboardView = () => import('./views/AdminDashboardView.vue')
const EditorView = () => import('./views/EditorView.vue')
const LandingView = () => import('./views/LandingView.vue')
const LoginView = () => import('./views/LoginView.vue')
const SetupView = () => import('./views/SetupView.vue')

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
  // migrateLegacyLocalProfile() is called once at app startup in main.ts — not here.
  const isPublicRoute =
    to.path === '/login' ||
    to.path === '/admin' ||
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

