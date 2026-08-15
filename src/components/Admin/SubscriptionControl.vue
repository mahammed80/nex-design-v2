<script setup lang="ts">
import { ref } from 'vue'
import { useAdminStore } from '@/app/admin/store'
import type { SubscriptionPlan, SubscriptionStatus, CloudProviderType } from '@/app/admin/types'

const {
  plans,
  subscribers,
  cloudSettings,
  subscriberSearchQuery,
  subscriberStatusFilter,
  subscriberPlanFilter,
  filteredSubscribers,
  addSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  updateCloudSettings,
  updateSubscriberStatus,
  updateSubscriberPlan
} = useAdminStore()

const activeSubTab = ref<'plans' | 'subscribers' | 'cloud'>('plans')

// Modal state for Plan Create / Edit
const isPlanModalOpen = ref(false)
const editingPlanId = ref<string | null>(null)
const planFormName = ref('')
const planFormPriceMonthly = ref(0)
const planFormPriceAnnual = ref(0)
const planFormMembers = ref(1)
const planFormStorageGb = ref(10)
const planFormAiCredits = ref(100)
const planFormFeatures = ref('')
const planFormCloudSyncEnabled = ref(true)
const planFormCloudBackupInterval = ref(15)
const planFormIsPopular = ref(false)

function openCreatePlanModal() {
  editingPlanId.value = null
  planFormName.value = ''
  planFormPriceMonthly.value = 29
  planFormPriceAnnual.value = 280
  planFormMembers.value = 5
  planFormStorageGb.value = 100
  planFormAiCredits.value = 2000
  planFormFeatures.value = 'Unlimited Projects\nShared Workspace\nOptional Cloud Sync & Backup'
  planFormCloudSyncEnabled.value = true
  planFormCloudBackupInterval.value = 15
  planFormIsPopular.value = false
  isPlanModalOpen.value = true
}

function openEditPlanModal(plan: SubscriptionPlan) {
  editingPlanId.value = plan.id
  planFormName.value = plan.name
  planFormPriceMonthly.value = plan.priceMonthly
  planFormPriceAnnual.value = plan.priceAnnual
  planFormMembers.value = plan.maxMembers
  planFormStorageGb.value = plan.storageGb
  planFormAiCredits.value = plan.aiCredits
  planFormFeatures.value = plan.features.join('\n')
  planFormCloudSyncEnabled.value = plan.cloudSyncEnabled
  planFormCloudBackupInterval.value = plan.cloudBackupIntervalMinutes
  planFormIsPopular.value = !!plan.isPopular
  isPlanModalOpen.value = true
}

function savePlan() {
  if (!planFormName.value.trim()) return

  const featuresList = planFormFeatures.value
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.length > 0)

  if (editingPlanId.value) {
    updateSubscriptionPlan(editingPlanId.value, {
      name: planFormName.value.trim(),
      priceMonthly: Number(planFormPriceMonthly.value),
      priceAnnual: Number(planFormPriceAnnual.value),
      maxMembers: Number(planFormMembers.value),
      storageGb: Number(planFormStorageGb.value),
      aiCredits: Number(planFormAiCredits.value),
      features: featuresList,
      cloudSyncEnabled: planFormCloudSyncEnabled.value,
      cloudBackupIntervalMinutes: Number(planFormCloudBackupInterval.value),
      isPopular: planFormIsPopular.value
    })
  } else {
    addSubscriptionPlan({
      name: planFormName.value.trim(),
      priceMonthly: Number(planFormPriceMonthly.value),
      priceAnnual: Number(planFormPriceAnnual.value),
      currency: 'USD',
      maxMembers: Number(planFormMembers.value),
      storageGb: Number(planFormStorageGb.value),
      aiCredits: Number(planFormAiCredits.value),
      features: featuresList,
      cloudSyncEnabled: planFormCloudSyncEnabled.value,
      cloudBackupIntervalMinutes: Number(planFormCloudBackupInterval.value),
      isPopular: planFormIsPopular.value,
      status: 'active'
    })
  }
  isPlanModalOpen.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header & sub-tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">Subscription & Cloud Governance</h2>
        <p class="text-xs text-zinc-400 mt-1">Manage pricing tiers, optional cloud sync offers, and subscriber status</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Sub-tabs switcher -->
        <div class="flex p-1 rounded-xl bg-zinc-900 border border-white/10 text-xs">
          <button
            @click="activeSubTab = 'plans'"
            class="px-3.5 py-1.5 rounded-lg font-medium transition"
            :class="activeSubTab === 'plans' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
          >
            Tiers ({{ plans.length }})
          </button>
          <button
            @click="activeSubTab = 'cloud'"
            class="px-3.5 py-1.5 rounded-lg font-medium transition"
            :class="activeSubTab === 'cloud' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
          >
            Cloud Provider & Sync
          </button>
          <button
            @click="activeSubTab = 'subscribers'"
            class="px-3.5 py-1.5 rounded-lg font-medium transition"
            :class="activeSubTab === 'subscribers' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
          >
            Subscribers ({{ subscribers.length }})
          </button>
        </div>

        <button
          v-if="activeSubTab === 'plans'"
          @click="openCreatePlanModal"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Plan
        </button>
      </div>
    </div>

    <!-- PLANS TAB CONTENT -->
    <div v-if="activeSubTab === 'plans'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 relative flex flex-col justify-between group hover:border-violet-500/40 transition"
        :class="{ 'ring-2 ring-violet-500/50 bg-gradient-to-b from-zinc-900 via-zinc-900 to-violet-950/20': plan.isPopular }"
      >
        <div v-if="plan.isPopular" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
          Most Popular
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white">{{ plan.name }}</h3>
            <span
              class="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full"
              :class="plan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'"
            >
              {{ plan.status }}
            </span>
          </div>

          <div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-extrabold text-white">${{ plan.priceMonthly }}</span>
              <span class="text-xs text-zinc-400">/ month</span>
            </div>
            <div class="text-[11px] text-zinc-400 mt-1">
              or ${{ plan.priceAnnual }} billed annually
            </div>
          </div>

          <!-- Cloud Sync Pill Badge -->
          <div class="p-2.5 rounded-xl border flex items-center justify-between text-xs" :class="plan.cloudSyncEnabled ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-zinc-950 border-white/5 text-zinc-400'">
            <div class="flex items-center gap-2">
              <span>☁️ Cloud Sync:</span>
              <span class="font-bold">{{ plan.cloudSyncEnabled ? 'Enabled' : 'Disabled (Local Only)' }}</span>
            </div>
            <span v-if="plan.cloudSyncEnabled" class="text-[10px] font-mono text-cyan-400">Every {{ plan.cloudBackupIntervalMinutes }}m</span>
          </div>

          <div class="space-y-2 pt-2 border-t border-white/5 text-xs text-zinc-300">
            <div class="flex items-center justify-between text-zinc-400">
              <span>Max Members:</span>
              <span class="font-medium text-white">{{ plan.maxMembers }}</span>
            </div>
            <div class="flex items-center justify-between text-zinc-400">
              <span>Storage Quota:</span>
              <span class="font-medium text-white">{{ plan.storageGb }} GB</span>
            </div>
            <div class="flex items-center justify-between text-zinc-400">
              <span>AI Credits:</span>
              <span class="font-medium text-violet-400">{{ plan.aiCredits.toLocaleString() }} / mo</span>
            </div>
          </div>

          <ul class="space-y-1.5 pt-3 border-t border-white/5 text-xs text-zinc-300">
            <li v-for="(feat, idx) in plan.features" :key="idx" class="flex items-center gap-2 text-zinc-300">
              <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="truncate">{{ feat }}</span>
            </li>
          </ul>
        </div>

        <div class="pt-6 flex items-center gap-2">
          <button
            @click="openEditPlanModal(plan)"
            class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 transition"
          >
            Edit Plan
          </button>
          <button
            @click="deleteSubscriptionPlan(plan.id)"
            class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
            title="Delete Plan"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- CLOUD SETTINGS TAB CONTENT -->
    <div v-else-if="activeSubTab === 'cloud'" class="max-w-3xl space-y-6">
      <div class="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-6">
        <div>
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            ☁️ Cloud Storage & Offline Auto-Sync Configuration
          </h3>
          <p class="text-xs text-zinc-400 mt-1">
            Configure optional cloud sync endpoints and offline reconciliation behaviors.
          </p>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-zinc-400 mb-1.5 font-medium">Cloud Storage Provider</label>
            <select
              :value="cloudSettings.provider"
              @change="(e) => updateCloudSettings({ provider: (e.target as HTMLSelectElement).value as CloudProviderType })"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              <option value="cloudflare_r2">Cloudflare R2 Storage (Recommended)</option>
              <option value="aws_s3">Amazon S3 Storage Bucket</option>
              <option value="custom_endpoint">Custom REST / WebSocket Endpoint</option>
              <option value="disabled">Disabled (100% Local PC Storage Only)</option>
            </select>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1.5 font-medium">Cloud Endpoint URL</label>
            <input
              :value="cloudSettings.endpointUrl"
              @input="(e) => updateCloudSettings({ endpointUrl: (e.target as HTMLInputElement).value })"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1.5 font-medium">Default Per-User Cloud Quota (GB)</label>
              <input
                :value="cloudSettings.maxCloudStoragePerUserGb"
                @input="(e) => updateCloudSettings({ maxCloudStoragePerUserGb: Number((e.target as HTMLInputElement).value) })"
                type="number"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div class="flex items-center gap-3 pt-6">
              <input
                id="auto-sync-chk"
                :checked="cloudSettings.autoSyncOnOnline"
                @change="(e) => updateCloudSettings({ autoSyncOnOnline: (e.target as HTMLInputElement).checked })"
                type="checkbox"
                class="rounded bg-zinc-950 border-white/10 text-violet-600 w-4 h-4"
              />
              <label for="auto-sync-chk" class="text-zinc-200 font-medium cursor-pointer">
                Automatically sync offline edits when returning online
              </label>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs text-violet-300">
          <span class="font-bold">Offline Resilience Guarantee:</span> When network is disconnected, edits are written to local PC IndexedDB queues. Upon returning online, Yjs state vectors automatically reconcile with the cloud without data loss.
        </div>
      </div>
    </div>

    <!-- SUBSCRIBERS TAB CONTENT -->
    <div v-else class="space-y-4">
      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
        <div class="w-full sm:w-80 relative">
          <svg class="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="subscriberSearchQuery"
            type="text"
            placeholder="Search subscriber by name or email..."
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select
            v-model="subscriberStatusFilter"
            class="px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </select>

          <select
            v-model="subscriberPlanFilter"
            class="px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Plan Tiers</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>

      <!-- Subscribers Table -->
      <div class="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-zinc-950/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th class="py-3.5 px-4">User Details</th>
                <th class="py-3.5 px-4">Current Plan</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4">Billing Cycle</th>
                <th class="py-3.5 px-4">Usage (Storage / AI)</th>
                <th class="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs text-zinc-300">
              <tr v-for="sub in filteredSubscribers" :key="sub.id" class="hover:bg-white/5 transition">
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-violet-300 shrink-0">
                      <img v-if="sub.avatar" :src="sub.avatar" :alt="sub.userName" class="w-full h-full object-cover" />
                      <span v-else>{{ sub.userName[0] }}</span>
                    </div>
                    <div>
                      <div class="font-semibold text-white">{{ sub.userName }}</div>
                      <div class="text-[11px] text-zinc-400">{{ sub.userEmail }}</div>
                    </div>
                  </div>
                </td>

                <td class="py-3.5 px-4">
                  <select
                    :value="sub.planId"
                    @change="(e) => updateSubscriberPlan(sub.id, (e.target as HTMLSelectElement).value)"
                    class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 text-xs text-violet-300 font-medium focus:outline-none"
                  >
                    <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </td>

                <td class="py-3.5 px-4">
                  <select
                    :value="sub.status"
                    @change="(e) => updateSubscriberStatus(sub.id, (e.target as HTMLSelectElement).value as SubscriptionStatus)"
                    class="px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none bg-zinc-950 border border-white/10"
                    :class="{
                      'text-emerald-400': sub.status === 'active',
                      'text-cyan-400': sub.status === 'trialing',
                      'text-amber-400': sub.status === 'past_due',
                      'text-rose-400': sub.status === 'canceled'
                    }"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </td>

                <td class="py-3.5 px-4 capitalize text-zinc-400">
                  {{ sub.billingCycle }}
                </td>

                <td class="py-3.5 px-4 text-zinc-400">
                  <div>{{ sub.storageUsedGb }} GB storage</div>
                  <div class="text-[11px] text-violet-400">{{ sub.aiCreditsUsed }} AI credits used</div>
                </td>

                <td class="py-3.5 px-4 text-right">
                  <button
                    @click="updateSubscriberStatus(sub.id, sub.status === 'active' ? 'canceled' : 'active')"
                    class="px-3 py-1 rounded-lg text-[11px] font-medium border transition"
                    :class="sub.status === 'active' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'"
                  >
                    {{ sub.status === 'active' ? 'Revoke Subscription' : 'Activate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT PLAN MODAL -->
    <div v-if="isPlanModalOpen" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 class="text-base font-bold text-white">
            {{ editingPlanId ? 'Edit Subscription Plan' : 'Create New Subscription Plan' }}
          </h3>
          <button @click="isPlanModalOpen = false" class="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-zinc-400 mb-1">Plan Name</label>
            <input v-model="planFormName" type="text" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-zinc-400 mb-1">Monthly Price ($)</label>
              <input v-model.number="planFormPriceMonthly" type="number" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
            </div>
            <div>
              <label class="block text-zinc-400 mb-1">Annual Price ($)</label>
              <input v-model.number="planFormPriceAnnual" type="number" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-zinc-400 mb-1">Max Members</label>
              <input v-model.number="planFormMembers" type="number" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
            </div>
            <div>
              <label class="block text-zinc-400 mb-1">Storage (GB)</label>
              <input v-model.number="planFormStorageGb" type="number" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
            </div>
            <div>
              <label class="block text-zinc-400 mb-1">AI Credits/mo</label>
              <input v-model.number="planFormAiCredits" type="number" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white" />
            </div>
          </div>

          <!-- Cloud Sync Options -->
          <div class="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
            <div class="flex items-center gap-2">
              <input id="cloud-sync-chk" v-model="planFormCloudSyncEnabled" type="checkbox" class="rounded bg-zinc-900 border-white/10 text-violet-600" />
              <label for="cloud-sync-chk" class="text-zinc-200 font-semibold">Enable Optional Cloud Sync & Backup</label>
            </div>
            <div v-if="planFormCloudSyncEnabled" class="flex items-center gap-2 pt-1">
              <label class="text-zinc-400 shrink-0">Auto-Backup Frequency (Minutes):</label>
              <input v-model.number="planFormCloudBackupInterval" type="number" class="w-24 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white" />
            </div>
          </div>

          <div>
            <label class="block text-zinc-400 mb-1">Features (One per line)</label>
            <textarea v-model="planFormFeatures" rows="3" class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white"></textarea>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input id="popular-chk" v-model="planFormIsPopular" type="checkbox" class="rounded bg-zinc-950 border-white/10 text-violet-600" />
            <label for="popular-chk" class="text-zinc-300">Highlight as "Most Popular" Plan</label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button @click="isPlanModalOpen = false" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300">
            Cancel
          </button>
          <button @click="savePlan" class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow">
            Save Plan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
