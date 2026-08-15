export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
export type BillingCycle = 'monthly' | 'annual'

export interface SubscriptionPlan {
  id: string
  name: string
  priceMonthly: number
  priceAnnual: number
  currency: string
  maxMembers: number
  storageGb: number
  aiCredits: number
  features: string[]
  cloudSyncEnabled: boolean
  cloudBackupIntervalMinutes: number
  isPopular?: boolean
  status: 'active' | 'archived'
  createdAt: number
}

export interface Subscriber {
  id: string
  userEmail: string
  userName: string
  avatar?: string
  planId: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  nextBillingDate: number
  storageUsedGb: number
  aiCreditsUsed: number
  createdAt: number
}

export type CloudProviderType = 'cloudflare_r2' | 'aws_s3' | 'custom_endpoint' | 'disabled'

export interface CloudProviderSettings {
  provider: CloudProviderType
  endpointUrl: string
  autoSyncOnOnline: boolean
  maxCloudStoragePerUserGb: number
}

export type PluginCategory = 'ai' | 'vector' | 'layout' | 'export' | 'utility'
export type PluginStatus = 'published' | 'draft' | 'disabled' | 'featured'

export interface PluginRecord {
  id: string
  name: string
  slug: string
  author: string
  category: PluginCategory
  version: string
  status: PluginStatus
  description: string
  iconUrl?: string
  manifestJson: string
  scriptUrl?: string
  permissions: string[]
  downloadsCount: number
  rating: number
  createdAt: number
  updatedAt: number
}

export interface AdminStats {
  totalRevenue: number
  mrr: number
  activeSubscribers: number
  activePlugins: number
  totalDownloads: number
}
