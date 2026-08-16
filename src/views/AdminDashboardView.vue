<script setup lang="ts">
import { useAdminStore } from '@/app/admin/store'
import AdminHeader from '@/components/Admin/AdminHeader.vue'
import AdminSidebar from '@/components/Admin/AdminSidebar.vue'
import OverviewStats from '@/components/Admin/OverviewStats.vue'
import SubscriptionControl from '@/components/Admin/SubscriptionControl.vue'
import PluginControl from '@/components/Admin/PluginControl.vue'
import EmailControl from '@/components/Admin/EmailControl.vue'
import WorkflowLogsPanel from '@/components/Admin/WorkflowLogsPanel.vue'

const { activeTab } = useAdminStore()
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col antialiased selection:bg-violet-600 selection:text-white">
    <!-- Header -->
    <AdminHeader />

    <!-- Main Content Area with Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <AdminSidebar />

      <!-- Tab Content Area -->
      <main class="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
        <OverviewStats v-if="activeTab === 'overview'" />
        <SubscriptionControl v-else-if="activeTab === 'subscriptions' || activeTab === 'subscribers'" />
        <PluginControl v-else-if="activeTab === 'plugins'" />
        <EmailControl v-else-if="activeTab === 'emails'" />
        <WorkflowLogsPanel v-else-if="activeTab === 'workflows'" />
      </main>
    </div>
  </div>
</template>
