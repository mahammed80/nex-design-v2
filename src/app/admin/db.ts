import { useLocalStorage } from '@vueuse/core'
import type { SubscriptionPlan, Subscriber, PluginRecord, CloudProviderSettings, WorkflowLogRecord } from './types'

const PLANS_STORAGE_KEY = 'nex-design:admin:plans'
const SUBSCRIBERS_STORAGE_KEY = 'nex-design:admin:subscribers'
const PLUGINS_STORAGE_KEY = 'nex-design:admin:plugins'
const CLOUD_SETTINGS_STORAGE_KEY = 'nex-design:admin:cloud-settings'
const WORKFLOW_LOGS_STORAGE_KEY = 'nex-design:admin:workflow-logs'

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'Free Starter',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    maxMembers: 1,
    storageGb: 2,
    aiCredits: 50,
    allowTopupCredits: false,
    topupPricePer1k: 5,
    features: ['Basic Canvas Editing', 'Up to 3 Active Projects', 'Community Support', 'Standard Export (PNG/JPG)'],
    cloudSyncEnabled: false,
    cloudBackupIntervalMinutes: 60,
    status: 'active',
    createdAt: 1740000000000
  },
  {
    id: 'plan-pro',
    name: 'Pro Designer',
    priceMonthly: 19,
    priceAnnual: 180,
    currency: 'USD',
    maxMembers: 1,
    storageGb: 50,
    aiCredits: 1000,
    allowTopupCredits: true,
    topupPricePer1k: 4,
    features: ['Unlimited Projects', 'AI Co-pilot & Generation', 'Advanced Vector Tools', 'SVG & Code Export', 'Optional Cloud Sync & Backup'],
    cloudSyncEnabled: true,
    cloudBackupIntervalMinutes: 15,
    isPopular: true,
    status: 'active',
    createdAt: 1740000000000
  },
  {
    id: 'plan-team',
    name: 'Team Collaboration',
    priceMonthly: 49,
    priceAnnual: 460,
    currency: 'USD',
    maxMembers: 10,
    storageGb: 500,
    aiCredits: 5000,
    allowTopupCredits: true,
    topupPricePer1k: 3,
    features: ['Real-time P2P Collaboration', 'Shared Team Libraries', 'Design Versioning & History', 'Automatic Cloud Relay', 'Role Permissions'],
    cloudSyncEnabled: true,
    cloudBackupIntervalMinutes: 5,
    status: 'active',
    createdAt: 1740000000000
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Scale',
    priceMonthly: 149,
    priceAnnual: 1400,
    currency: 'USD',
    maxMembers: 100,
    storageGb: 2000,
    aiCredits: 25000,
    allowTopupCredits: true,
    topupPricePer1k: 2,
    features: ['Custom SSO / SAML', 'Dedicated Cloudflare Relay', 'Custom AI Provider Adapter', 'Audit Logs & SLA', 'Dedicated Account Manager'],
    cloudSyncEnabled: true,
    cloudBackupIntervalMinutes: 1,
    status: 'active',
    createdAt: 1740000000000
  }
]

const DEFAULT_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    userName: 'Mohamed Ahmed',
    userEmail: 'mohamed@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    planId: 'plan-pro',
    status: 'active',
    billingCycle: 'monthly',
    nextBillingDate: Date.now() + 86400000 * 20,
    storageUsedGb: 14.2,
    aiCreditsUsed: 420,
    topupCreditsRemaining: 500,
    createdAt: Date.now() - 86400000 * 90
  },
  {
    id: 'sub-2',
    userName: 'Sarah Chen',
    userEmail: 'sarah.c@designstudio.io',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    planId: 'plan-team',
    status: 'active',
    billingCycle: 'annual',
    nextBillingDate: Date.now() + 86400000 * 180,
    storageUsedGb: 120.5,
    aiCreditsUsed: 3100,
    topupCreditsRemaining: 2000,
    createdAt: Date.now() - 86400000 * 150
  },
  {
    id: 'sub-3',
    userName: 'Alex Rivera',
    userEmail: 'alex@frontendcraft.dev',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
    planId: 'plan-free',
    status: 'active',
    billingCycle: 'monthly',
    nextBillingDate: Date.now() + 86400000 * 30,
    storageUsedGb: 0.8,
    aiCreditsUsed: 42,
    topupCreditsRemaining: 0,
    createdAt: Date.now() - 86400000 * 15
  },
  {
    id: 'sub-4',
    userName: 'Elena Rostova',
    userEmail: 'elena@enterprise.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    planId: 'plan-enterprise',
    status: 'trialing',
    billingCycle: 'annual',
    nextBillingDate: Date.now() + 86400000 * 7,
    storageUsedGb: 310.0,
    aiCreditsUsed: 8900,
    topupCreditsRemaining: 10000,
    createdAt: Date.now() - 86400000 * 7
  }
]

const DEFAULT_PLUGINS: PluginRecord[] = [
  {
    id: 'plugin-ai-gen',
    name: 'AI UI Component Builder',
    slug: 'ai-component-builder',
    author: 'NexDesign Core Team',
    category: 'ai',
    version: '1.4.0',
    status: 'featured',
    description: 'Generates responsive Vue and Tailwind UI components directly on the Canvas using natural language prompts.',
    iconUrl: 'https://api.iconify.design/lucide:sparkles.svg?color=%238b5cf6',
    manifestJson: JSON.stringify(
      {
        name: 'AI UI Component Builder',
        id: 'ai-component-builder',
        api: '1.0.0',
        main: 'main.js',
        permissions: ['scene:read', 'scene:write', 'network:fetch', 'ai:prompt']
      },
      null,
      2
    ),
    scriptUrl: 'https://cdn.nexdesign.dev/plugins/ai-component-builder.js',
    permissions: ['scene:read', 'scene:write', 'network:fetch', 'ai:prompt'],
    isWebWorkerSandboxRequired: true,
    downloadsCount: 14250,
    rating: 4.9,
    createdAt: Date.now() - 86400000 * 120,
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    id: 'plugin-vector-opt',
    name: 'SVG Vector Optimizer & Cleaner',
    slug: 'svg-vector-optimizer',
    author: 'VectorCraft',
    category: 'vector',
    version: '2.1.2',
    status: 'published',
    description: 'Clean up redundant SVG path anchors, merge duplicate layers, and compress vector networks for high performance.',
    iconUrl: 'https://api.iconify.design/lucide:scissors.svg?color=%2306b6d4',
    manifestJson: JSON.stringify(
      {
        name: 'SVG Vector Optimizer & Cleaner',
        id: 'svg-vector-optimizer',
        api: '1.0.0',
        main: 'dist/index.js',
        permissions: ['scene:read', 'scene:write']
      },
      null,
      2
    ),
    scriptUrl: 'https://cdn.nexdesign.dev/plugins/svg-optimizer.js',
    permissions: ['scene:read', 'scene:write'],
    isWebWorkerSandboxRequired: true,
    downloadsCount: 8940,
    rating: 4.8,
    createdAt: Date.now() - 86400000 * 90,
    updatedAt: Date.now() - 86400000 * 12
  },
  {
    id: 'plugin-auto-grid',
    name: 'Smart Auto-Layout Grid Assistant',
    slug: 'smart-auto-layout',
    author: 'LayoutLabs',
    category: 'layout',
    version: '1.0.8',
    status: 'published',
    description: 'Instant conversion of absolute shapes into Flexbox/Yoga Auto-Layout structures with smart padding and gap detection.',
    iconUrl: 'https://api.iconify.design/lucide:layout-grid.svg?color=%2310b981',
    manifestJson: JSON.stringify(
      {
        name: 'Smart Auto-Layout Grid Assistant',
        id: 'smart-auto-layout',
        api: '1.0.0',
        main: 'plugin.js',
        permissions: ['scene:read', 'scene:write']
      },
      null,
      2
    ),
    scriptUrl: 'https://cdn.nexdesign.dev/plugins/auto-layout.js',
    permissions: ['scene:read', 'scene:write'],
    isWebWorkerSandboxRequired: true,
    downloadsCount: 6120,
    rating: 4.7,
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now() - 86400000 * 8
  },
  {
    id: 'plugin-export-code',
    name: 'JSX & Vue Single-File Exporter',
    slug: 'jsx-vue-exporter',
    author: 'NexDesign Core Team',
    category: 'export',
    version: '3.0.1',
    status: 'featured',
    description: 'Export selected canvas frames directly into production-grade Vue 3 components and React JSX code snippets.',
    iconUrl: 'https://api.iconify.design/lucide:code-2.svg?color=%23f59e0b',
    manifestJson: JSON.stringify(
      {
        name: 'JSX & Vue Single-File Exporter',
        id: 'jsx-vue-exporter',
        api: '1.0.0',
        main: 'exporter.js',
        permissions: ['scene:read', 'clipboard:write']
      },
      null,
      2
    ),
    scriptUrl: 'https://cdn.nexdesign.dev/plugins/jsx-vue-exporter.js',
    permissions: ['scene:read', 'clipboard:write'],
    isWebWorkerSandboxRequired: true,
    downloadsCount: 18900,
    rating: 4.95,
    createdAt: Date.now() - 86400000 * 180,
    updatedAt: Date.now() - 86400000 * 2
  }
]

const DEFAULT_CLOUD_SETTINGS: CloudProviderSettings = {
  provider: 'cloudflare_r2',
  endpointUrl: 'https://sync.nexdesign.dev/v1',
  autoSyncOnOnline: true,
  maxCloudStoragePerUserGb: 50
}

const DEFAULT_WORKFLOW_LOGS: WorkflowLogRecord[] = [
  {
    id: 'wf-log-1',
    timestamp: Date.now() - 1000 * 60 * 5,
    sessionType: 'acp',
    agentRole: 'Design Architect',
    action: 'design_skeleton',
    targetNodeId: 'node-root-101',
    aiCreditsSpent: 15,
    status: 'success',
    details: 'Generated multi-section dashboard layout skeleton with 4 content containers.'
  },
  {
    id: 'wf-log-2',
    timestamp: Date.now() - 1000 * 60 * 12,
    sessionType: 'in-app',
    agentRole: 'UI Builder',
    action: 'design_content',
    targetNodeId: 'node-hero-202',
    aiCreditsSpent: 25,
    status: 'success',
    details: 'Populated Hero section with heading, secondary description, CTA button, and avatar grid.'
  },
  {
    id: 'wf-log-3',
    timestamp: Date.now() - 1000 * 60 * 25,
    sessionType: 'mcp',
    agentRole: 'Design Auditor',
    action: 'design_refine',
    targetNodeId: 'node-root-101',
    aiCreditsSpent: 10,
    status: 'success',
    details: 'Executed deterministic anti-slop pass. Auto-aligned 3 nested flex frames and verified token compliance.'
  },
  {
    id: 'wf-log-4',
    timestamp: Date.now() - 1000 * 60 * 45,
    sessionType: 'acp',
    agentRole: 'Design Architect',
    action: 'render_jsx',
    targetNodeId: 'node-card-305',
    aiCreditsSpent: 20,
    status: 'failed',
    details: 'JSX parsing error: unclosed tag inside custom icon wrapper component.'
  }
]

export const plansStorage = useLocalStorage<SubscriptionPlan[]>(PLANS_STORAGE_KEY, DEFAULT_PLANS)
export const subscribersStorage = useLocalStorage<Subscriber[]>(SUBSCRIBERS_STORAGE_KEY, DEFAULT_SUBSCRIBERS)
export const pluginsStorage = useLocalStorage<PluginRecord[]>(PLUGINS_STORAGE_KEY, DEFAULT_PLUGINS)
export const cloudSettingsStorage = useLocalStorage<CloudProviderSettings>(
  CLOUD_SETTINGS_STORAGE_KEY,
  DEFAULT_CLOUD_SETTINGS
)
export const workflowLogsStorage = useLocalStorage<WorkflowLogRecord[]>(
  WORKFLOW_LOGS_STORAGE_KEY,
  DEFAULT_WORKFLOW_LOGS
)

export function loadSubscriptionPlansFromStorage(): SubscriptionPlan[] {
  return plansStorage.value
}

export function saveSubscriptionPlansToStorage(plans: SubscriptionPlan[]): void {
  plansStorage.value = plans
}

export function loadSubscribersFromStorage(): Subscriber[] {
  return subscribersStorage.value
}

export function saveSubscribersToStorage(subscribers: Subscriber[]): void {
  subscribersStorage.value = subscribers
}

export function loadPluginsFromStorage(): PluginRecord[] {
  return pluginsStorage.value
}

export function savePluginsToStorage(plugins: PluginRecord[]): void {
  pluginsStorage.value = plugins
}

export function loadCloudSettingsFromStorage(): CloudProviderSettings {
  return cloudSettingsStorage.value
}

export function saveCloudSettingsToStorage(settings: CloudProviderSettings): void {
  cloudSettingsStorage.value = settings
}

export function loadWorkflowLogsFromStorage(): WorkflowLogRecord[] {
  return workflowLogsStorage.value
}

export function saveWorkflowLogsToStorage(logs: WorkflowLogRecord[]): void {
  workflowLogsStorage.value = logs
}
