<script setup lang="ts">
import { useAdminStore } from '@/app/admin/store'

const { stats, plans, subscribers, plugins, activeTab } = useAdminStore()
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-xl font-bold text-white tracking-tight">Overview & Performance</h2>
      <p class="text-xs text-zinc-400 mt-1">Real-time metrics across platform subscriptions and plugin ecosystem</p>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 relative overflow-hidden group hover:border-violet-500/30 transition">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition"></div>
        <div class="text-xs font-medium text-zinc-400">Monthly Recurring Revenue</div>
        <div class="text-2xl font-extrabold text-white mt-2 tracking-tight">
          ${{ stats.mrr.toLocaleString() }}
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-3">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>ARR Est: ${{ stats.totalRevenue.toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 relative overflow-hidden group hover:border-cyan-500/30 transition">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition"></div>
        <div class="text-xs font-medium text-zinc-400">Active Subscribers</div>
        <div class="text-2xl font-extrabold text-white mt-2 tracking-tight">
          {{ stats.activeSubscribers }}
        </div>
        <div class="text-[11px] text-cyan-400 mt-3 flex items-center justify-between">
          <span>Across {{ plans.length }} Subscription Tiers</span>
          <button @click="activeTab = 'subscribers'" class="hover:underline">View</button>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition"></div>
        <div class="text-xs font-medium text-zinc-400">Active Marketplace Plugins</div>
        <div class="text-2xl font-extrabold text-white mt-2 tracking-tight">
          {{ stats.activePlugins }}
        </div>
        <div class="text-[11px] text-emerald-400 mt-3 flex items-center justify-between">
          <span>Total Published & Featured</span>
          <button @click="activeTab = 'plugins'" class="hover:underline">Manage</button>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 relative overflow-hidden group hover:border-amber-500/30 transition">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition"></div>
        <div class="text-xs font-medium text-zinc-400">Total Plugin Downloads</div>
        <div class="text-2xl font-extrabold text-white mt-2 tracking-tight">
          {{ stats.totalDownloads.toLocaleString() }}
        </div>
        <div class="text-[11px] text-amber-400 mt-3">
          Community Installs
        </div>
      </div>
    </div>

    <!-- Overview details grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Subscribers Widget -->
      <div class="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white">Recent Subscribers</h3>
          <button @click="activeTab = 'subscribers'" class="text-xs text-violet-400 hover:text-violet-300">View All</button>
        </div>
        <div class="space-y-3">
          <div
            v-for="sub in subscribers.slice(0, 3)"
            :key="sub.id"
            class="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-xs text-violet-300">
                <img v-if="sub.avatar" :src="sub.avatar" :alt="sub.userName" class="w-full h-full object-cover" />
                <span v-else>{{ sub.userName[0] }}</span>
              </div>
              <div>
                <div class="text-xs font-medium text-white">{{ sub.userName }}</div>
                <div class="text-[11px] text-zinc-400">{{ sub.userEmail }}</div>
              </div>
            </div>
            <div class="text-right">
              <span
                class="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider"
                :class="{
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': sub.status === 'active',
                  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20': sub.status === 'trialing',
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20': sub.status === 'past_due',
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20': sub.status === 'canceled'
                }"
              >
                {{ sub.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Plugins Widget -->
      <div class="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white">Top Marketplace Plugins</h3>
          <button @click="activeTab = 'plugins'" class="text-xs text-violet-400 hover:text-violet-300">Manage Plugins</button>
        </div>
        <div class="space-y-3">
          <div
            v-for="plug in plugins.slice(0, 3)"
            :key="plug.id"
            class="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
                {{ plug.name[0] }}
              </div>
              <div>
                <div class="text-xs font-medium text-white flex items-center gap-1.5">
                  {{ plug.name }}
                  <span class="text-[10px] text-zinc-500">v{{ plug.version }}</span>
                </div>
                <div class="text-[11px] text-zinc-400">{{ plug.author }}</div>
              </div>
            </div>
            <div class="text-right text-xs">
              <div class="font-semibold text-white">{{ plug.downloadsCount.toLocaleString() }} installs</div>
              <div class="text-[10px] text-amber-400">★ {{ plug.rating }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
