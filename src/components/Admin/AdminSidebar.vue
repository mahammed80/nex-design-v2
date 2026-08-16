<script setup lang="ts">
import { useAdminStore, type AdminTab } from '@/app/admin/store'

const { activeTab, stats } = useAdminStore()

interface NavItem {
  id: AdminTab
  label: string
  badge?: number | string
  icon: string
}

const navItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview & Analytics',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
  },
  {
    id: 'subscriptions',
    label: 'Subscription Plans',
    badge: 'Tiers',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
  },
  {
    id: 'subscribers',
    label: 'Subscribers & Members',
    badge: stats.value.activeSubscribers,
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
  },
  {
    id: 'plugins',
    label: 'Plugins Control',
    badge: stats.value.activePlugins,
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
  },
  {
    id: 'emails',
    label: 'Email Templates & Logs',
    badge: '7 Events',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  },
  {
    id: 'workflows',
    label: 'Workflow & Audits',
    badge: 'Telemetry',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
]

function selectTab(id: AdminTab) {
  activeTab.value = id
}
</script>

<template>
  <aside class="w-64 border-r border-white/10 bg-zinc-950/60 p-4 flex flex-col justify-between shrink-0">
    <div class="space-y-6">
      <div class="px-3 py-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        Management Navigation
      </div>

      <nav class="space-y-1">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="selectTab(item.id)"
          class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition"
          :class="[
            activeTab === item.id
              ? 'bg-gradient-to-r from-rose-600/20 to-red-600/10 text-white border border-rose-500/30 shadow-inner'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
          ]"
        >
          <div class="flex items-center gap-3">
            <svg
              class="w-4 h-4 transition"
              :class="activeTab === item.id ? 'text-rose-400' : 'text-zinc-500'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
            </svg>
            <span>{{ item.label }}</span>
          </div>

          <span
            v-if="item.badge !== undefined"
            class="px-2 py-0.5 text-[10px] font-semibold rounded-full"
            :class="[
              activeTab === item.id
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-zinc-800 text-zinc-400'
            ]"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Admin info footer -->
    <div class="p-3 rounded-xl bg-zinc-900/50 border border-white/5 text-xs">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/30 flex items-center justify-center font-bold text-rose-300">
          A
        </div>
        <div>
          <div class="font-medium text-zinc-200">System Admin</div>
          <div class="text-[10px] text-emerald-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Superuser Session
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
