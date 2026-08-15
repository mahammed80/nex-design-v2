import { createRouter, createWebHistory } from 'vue-router'

import LandingView from './views/LandingView.vue'
import EditorView from './views/EditorView.vue'
import DashboardView from './views/DashboardView.vue'
import AdminDashboardView from './views/AdminDashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/admin', component: AdminDashboardView },
    { path: '/landing', component: LandingView },
    { path: '/editor', component: EditorView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView }
  ]
})

let isInitialLoad = true

router.beforeEach((to) => {
  if (to.path === '/editor' && isInitialLoad) {
    isInitialLoad = false
    return '/'
  }
  isInitialLoad = false
})

export default router
