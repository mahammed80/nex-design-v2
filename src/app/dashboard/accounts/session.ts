import { GUEST_TRIAL_DURATION_MS, IS_BROWSER } from '@/constants'

import { getAccountStorage } from './storage'

export type LocalProfileKind = 'local' | 'guest'

export interface LocalProfile {
  id: string
  name: string
  createdAt: number
  kind?: LocalProfileKind
  trialExpiresAt?: number
  remoteAccountId?: string
  email?: string
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

function persistProfiles(profiles: LocalProfile[]) {
  storage()?.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function createLocalProfile(name: string): LocalProfile {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Profile name is required')
  const profile = { id: crypto.randomUUID(), name: normalizedName, createdAt: Date.now() }
  persistProfiles([...listLocalProfiles(), profile])
  setActiveProfile(profile.id)
  return profile
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
  persistProfiles([...listLocalProfiles(), profile])
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
  persistProfiles(profiles)
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
