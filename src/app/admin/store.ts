import { ref, computed } from 'vue'
import type {
  SubscriptionPlan,
  Subscriber,
  PluginRecord,
  PluginCategory,
  PluginStatus,
  SubscriptionStatus,
  AdminStats,
  CloudProviderSettings
} from './types'
import {
  loadSubscriptionPlansFromStorage,
  saveSubscriptionPlansToStorage,
  loadSubscribersFromStorage,
  saveSubscribersToStorage,
  loadPluginsFromStorage,
  savePluginsToStorage,
  loadCloudSettingsFromStorage,
  saveCloudSettingsToStorage
} from './db'

export type AdminTab = 'overview' | 'subscriptions' | 'subscribers' | 'plugins' | 'emails'

// Active section tab state
const activeTab = ref<AdminTab>('overview')

// Subscriptions & Subscribers reactive state
const plans = ref<SubscriptionPlan[]>(loadSubscriptionPlansFromStorage())
const subscribers = ref<Subscriber[]>(loadSubscribersFromStorage())
const cloudSettings = ref<CloudProviderSettings>(loadCloudSettingsFromStorage())

// Subscriber search & filter state
const subscriberSearchQuery = ref('')
const subscriberStatusFilter = ref<SubscriptionStatus | 'all'>('all')
const subscriberPlanFilter = ref<string>('all')

// Plugins reactive state
const plugins = ref<PluginRecord[]>(loadPluginsFromStorage())

// Plugin search & filter state
const pluginSearchQuery = ref('')
const pluginCategoryFilter = ref<PluginCategory | 'all'>('all')
const pluginStatusFilter = ref<PluginStatus | 'all'>('all')
const pluginSortBy = ref<'popular' | 'newest' | 'name' | 'rating'>('popular')

// Computed Stats
const stats = computed<AdminStats>(() => {
  let mrr = 0
  for (const sub of subscribers.value) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      const plan = plans.value.find((p) => p.id === sub.planId)
      if (plan) {
        if (sub.billingCycle === 'monthly') {
          mrr += plan.priceMonthly
        } else {
          mrr += plan.priceAnnual / 12
        }
      }
    }
  }

  const activeSubs = subscribers.value.filter(
    (s) => s.status === 'active' || s.status === 'trialing'
  ).length

  const activePlugs = plugins.value.filter(
    (p) => p.status === 'published' || p.status === 'featured'
  ).length

  const totalDownloads = plugins.value.reduce((acc, p) => acc + p.downloadsCount, 0)

  return {
    totalRevenue: Math.round(mrr * 12),
    mrr: Math.round(mrr),
    activeSubscribers: activeSubs,
    activePlugins: activePlugs,
    totalDownloads
  }
})

// Filtered Subscribers
const filteredSubscribers = computed(() => {
  let result = [...subscribers.value]

  if (subscriberSearchQuery.value.trim()) {
    const q = subscriberSearchQuery.value.toLowerCase()
    result = result.filter(
      (s) => s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q)
    )
  }

  if (subscriberStatusFilter.value !== 'all') {
    result = result.filter((s) => s.status === subscriberStatusFilter.value)
  }

  if (subscriberPlanFilter.value !== 'all') {
    result = result.filter((s) => s.planId === subscriberPlanFilter.value)
  }

  return result
})

// Filtered and Sorted Plugins
const filteredPlugins = computed(() => {
  let result = [...plugins.value]

  if (pluginSearchQuery.value.trim()) {
    const q = pluginSearchQuery.value.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    )
  }

  if (pluginCategoryFilter.value !== 'all') {
    result = result.filter((p) => p.category === pluginCategoryFilter.value)
  }

  if (pluginStatusFilter.value !== 'all') {
    result = result.filter((p) => p.status === pluginStatusFilter.value)
  }

  result.sort((a, b) => {
    if (pluginSortBy.value === 'popular') {
      return b.downloadsCount - a.downloadsCount
    }
    if (pluginSortBy.value === 'newest') {
      return b.createdAt - a.createdAt
    }
    if (pluginSortBy.value === 'rating') {
      return b.rating - a.rating
    }
    return a.name.localeCompare(b.name)
  })

  return result
})

// Actions: Subscriptions & Plans
function addSubscriptionPlan(planData: Omit<SubscriptionPlan, 'id' | 'createdAt'>) {
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const id = `plan-${hex}`

  const newPlan: SubscriptionPlan = {
    ...planData,
    id,
    createdAt: Date.now()
  }
  plans.value.push(newPlan)
  saveSubscriptionPlansToStorage(plans.value)
}

function updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>) {
  const index = plans.value.findIndex((p) => p.id === id)
  if (index !== -1) {
    plans.value[index] = { ...plans.value[index], ...updates }
    saveSubscriptionPlansToStorage(plans.value)
  }
}

function deleteSubscriptionPlan(id: string) {
  plans.value = plans.value.filter((p) => p.id !== id)
  saveSubscriptionPlansToStorage(plans.value)
}

function updateCloudSettings(updates: Partial<CloudProviderSettings>) {
  cloudSettings.value = { ...cloudSettings.value, ...updates }
  saveCloudSettingsToStorage(cloudSettings.value)
}

// Actions: Subscribers
function updateSubscriberStatus(id: string, status: SubscriptionStatus) {
  const index = subscribers.value.findIndex((s) => s.id === id)
  if (index !== -1) {
    subscribers.value[index].status = status
    saveSubscribersToStorage(subscribers.value)
  }
}

function updateSubscriberPlan(id: string, planId: string) {
  const index = subscribers.value.findIndex((s) => s.id === id)
  if (index !== -1) {
    subscribers.value[index].planId = planId
    saveSubscribersToStorage(subscribers.value)
  }
}

// Actions: Plugins
function createPlugin(
  pluginData: Omit<PluginRecord, 'id' | 'downloadsCount' | 'rating' | 'createdAt' | 'updatedAt'>
) {
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const id = `plugin-${hex}`

  const now = Date.now()
  const newPlugin: PluginRecord = {
    ...pluginData,
    id,
    downloadsCount: 0,
    rating: 5.0,
    createdAt: now,
    updatedAt: now
  }

  plugins.value.unshift(newPlugin)
  savePluginsToStorage(plugins.value)
}

function updatePlugin(id: string, updates: Partial<PluginRecord>) {
  const index = plugins.value.findIndex((p) => p.id === id)
  if (index !== -1) {
    plugins.value[index] = {
      ...plugins.value[index],
      ...updates,
      updatedAt: Date.now()
    }
    savePluginsToStorage(plugins.value)
  }
}

function togglePluginStatus(id: string, newStatus: PluginStatus) {
  updatePlugin(id, { status: newStatus })
}

function deletePlugin(id: string) {
  plugins.value = plugins.value.filter((p) => p.id !== id)
  savePluginsToStorage(plugins.value)
}

export function useAdminStore() {
  return {
    activeTab,
    plans,
    subscribers,
    cloudSettings,
    subscriberSearchQuery,
    subscriberStatusFilter,
    subscriberPlanFilter,
    filteredSubscribers,

    plugins,
    pluginSearchQuery,
    pluginCategoryFilter,
    pluginStatusFilter,
    pluginSortBy,
    filteredPlugins,

    stats,

    addSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    updateCloudSettings,
    updateSubscriberStatus,
    updateSubscriberPlan,

    createPlugin,
    updatePlugin,
    togglePluginStatus,
    deletePlugin
  }
}
