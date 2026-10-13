import { GUEST_TRIAL_DURATION_MS, IS_BROWSER } from '@/constants'

import { getAccountStorage } from './storage'

export type LocalProfileKind = 'local' | 'guest'
export type LocalUserType = 'student' | 'graduate' | 'professional'
export type LocalPreferredOS = 'windows' | 'mac_arm' | 'mac_intel' | 'linux'

export interface LocalProfile {
  id: string
  name: string
  createdAt: number
  kind?: LocalProfileKind
  trialExpiresAt?: number
  remoteAccountId?: string
  email?: string
  avatar?: string

  // Academic & Career Details
  userType?: LocalUserType
  institution?: string
  facultyMajor?: string
  graduationYear?: number
  studentIdNumber?: string
  currentRole?: string
  portfolioUrl?: string

  // Preferences & Meta
  preferredOs?: LocalPreferredOS
  primaryUseCase?: string
  referralSource?: string
  waitlistNumber?: number
  planId?: string
  status?: string
}

export interface GuestTrialStatus {
  active: boolean
  expiresAt: number
  remainingMs: number
  remainingDays: number
}

const PROFILES_KEY = 'nex-design:profiles-v1'
const ACTIVE_PROFILE_KEY = 'nex-design:active-profile-id'
const LEGACY_ACTIVE_ACCOUNT_KEY = 'nex-design:active-account'

function storage(): Storage | null {
  return IS_BROWSER ? getAccountStorage() : null
}

export function listLocalProfiles(): LocalProfile[] {
  const accountStorage = storage()
  if (!accountStorage) return []
  try {
    const parsed: unknown = JSON.parse(accountStorage.getItem(PROFILES_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (profile): profile is LocalProfile =>
        typeof profile === 'object' &&
        profile !== null &&
        typeof (profile as LocalProfile).id === 'string' &&
        typeof (profile as LocalProfile).name === 'string' &&
        typeof (profile as LocalProfile).createdAt === 'number'
    )
  } catch {
    return []
  }
}

export function replaceLocalProfiles(profiles: LocalProfile[]): void {
  storage()?.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function createLocalProfile(name: string): LocalProfile {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Profile name is required')
  const profile = { id: crypto.randomUUID(), name: normalizedName, createdAt: Date.now() }
  replaceLocalProfiles([...listLocalProfiles(), profile])
  setActiveProfile(profile.id)
  return profile
}

export function linkRemoteAccount(
  accountId: string,
  name: string,
  email: string,
  extraDetails?: Partial<LocalProfile>
): LocalProfile {
  const profiles = listLocalProfiles()
  const existing = profiles.find(
    (profile) => profile.remoteAccountId === accountId || (profile.email && profile.email.toLowerCase() === email.toLowerCase())
  )
  if (existing) {
    existing.name = name.trim() || existing.name
    existing.email = email
    existing.remoteAccountId = accountId
    if (extraDetails) {
      Object.assign(existing, extraDetails)
    }
    replaceLocalProfiles(profiles)
    setActiveProfile(existing.id)
    return existing
  }
  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    name: name.trim() || email,
    email,
    remoteAccountId: accountId,
    kind: 'local',
    createdAt: Date.now(),
    ...extraDetails
  }
  replaceLocalProfiles([...profiles, profile])
  setActiveProfile(profile.id)
  return profile
}

export function updateLocalProfileDetails(
  profileId: string,
  updates: Partial<Omit<LocalProfile, 'id' | 'createdAt'>>
): boolean {
  const profiles = listLocalProfiles()
  const profile = profiles.find((item) => item.id === profileId)
  if (!profile) return false
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim()
    if (trimmed) profile.name = trimmed
  }
  Object.assign(profile, updates)
  replaceLocalProfiles(profiles)
  return true
}

export function createGuestProfile(now = Date.now()): LocalProfile {
  const existing = listLocalProfiles().find((profile) => profile.kind === 'guest')
  if (existing) {
    setActiveProfile(existing.id)
    return existing
  }

  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    name: 'Guest',
    kind: 'guest',
    createdAt: now,
    trialExpiresAt: now + GUEST_TRIAL_DURATION_MS
  }
  replaceLocalProfiles([...listLocalProfiles(), profile])
  setActiveProfile(profile.id)
  return profile
}

export function getGuestTrialStatus(
  profile: LocalProfile | null = getActiveProfile(),
  now = Date.now()
): GuestTrialStatus | null {
  if (profile?.kind !== 'guest') return null
  const expiresAt = profile.trialExpiresAt ?? profile.createdAt + GUEST_TRIAL_DURATION_MS
  const remainingMs = Math.max(0, expiresAt - now)
  return {
    active: remainingMs > 0,
    expiresAt,
    remainingMs,
    remainingDays: Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
  }
}

export function getActiveProfileId(): string | null {
  return storage()?.getItem(ACTIVE_PROFILE_KEY) ?? null
}

export function getActiveProfile(): LocalProfile | null {
  const activeId = getActiveProfileId()
  return listLocalProfiles().find((profile) => profile.id === activeId) ?? null
}

export function setActiveProfile(profileId: string) {
  if (!listLocalProfiles().some((profile) => profile.id === profileId)) {
    throw new Error('Local profile not found')
  }
  storage()?.setItem(ACTIVE_PROFILE_KEY, profileId)
}

export function renameLocalProfile(profileId: string, name: string): boolean {
  const normalizedName = name.trim()
  if (!normalizedName) return false
  const profiles = listLocalProfiles()
  const profile = profiles.find((item) => item.id === profileId)
  if (!profile) return false
  profile.name = normalizedName
  replaceLocalProfiles(profiles)
  return true
}

export function signOutLocalProfile() {
  storage()?.removeItem(ACTIVE_PROFILE_KEY)
}

export function migrateLegacyLocalProfile(): LocalProfile | null {
  const existing = getActiveProfile()
  if (existing) return existing
  const accountStorage = storage()
  if (!accountStorage) return null
  const legacyName = accountStorage.getItem(LEGACY_ACTIVE_ACCOUNT_KEY)
  if (!legacyName?.trim()) return null
  const matching = listLocalProfiles().find((profile) => profile.name === legacyName)
  if (matching) {
    setActiveProfile(matching.id)
    return matching
  }
  return createLocalProfile(legacyName)
}
