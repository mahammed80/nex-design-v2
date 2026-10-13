import { computed, ref } from 'vue'

import { IS_BROWSER } from '@/constants'
import {
  clearLinkedAccountSession,
  readLinkedAccountSession
} from '@/app/dashboard/accounts/access'
import {
  loginLinkedAccount,
  registerLinkedAccount,
  validateLinkedAccount
} from '@/app/dashboard/accounts/api'
import {
  getActiveProfile,
  linkRemoteAccount,
  listLocalProfiles,
  replaceLocalProfiles,
  setActiveProfile,
  signOutLocalProfile,
  updateLocalProfileDetails,
  type LocalProfile
} from '@/app/dashboard/accounts/session'

import type { AuthViewMode, PreferredOS, UserAccount, UserType } from './types'

const isAuthModalOpen = ref(false)
const activeAuthView = ref<AuthViewMode>('signin')
const isProfileModalOpen = ref(false)
const profileRevision = ref(0)

function notifyProfileChange() {
  profileRevision.value++
}

function resolvePlanId(profile: LocalProfile): string {
  if (profile.kind === 'guest') return 'plan-guest'
  if (profile.planId) return profile.planId
  if (profile.remoteAccountId) return 'plan-starter'
  return 'plan-starter'
}

function computeProfileEmail(profile: LocalProfile): string {
  if (profile.email && profile.email.trim()) return profile.email.trim()
  if (profile.kind === 'guest') return 'guest@local.workspace'
  if (profile.name.includes('@')) return profile.name.trim()
  const sanitized = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
  return `${sanitized || 'user'}@local.workspace`
}

function computeProfileDisplayName(profile: LocalProfile): string {
  if (profile.name.includes('@')) {
    const raw = profile.name.split('@')[0] || 'User'
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  return profile.name || 'User'
}

function profileToUserAccount(profile: LocalProfile): UserAccount {
  const email = computeProfileEmail(profile)
  const name = computeProfileDisplayName(profile)

  return {
    id: profile.remoteAccountId || profile.id,
    name,
    email,
    avatar: profile.avatar,
    role: email.toLowerCase().includes('admin') ? 'admin' : 'designer',
    planId: resolvePlanId(profile),
    emailVerified: Boolean(profile.remoteAccountId),
    createdAt: profile.createdAt,
    lastLoginAt: Date.now(),

    // Academic & Professional
    userType: profile.userType || 'student',
    institution: profile.institution || 'Nexus Design Academy',
    facultyMajor: profile.facultyMajor || 'Interface & System Design',
    graduationYear: profile.graduationYear || 2026,
    studentIdNumber: profile.studentIdNumber || 'NX-2026-STUDENT',
    currentRole: profile.currentRole || 'Design System Architect',
    portfolioUrl: profile.portfolioUrl || 'https://github.com',

    // Environment & Preferences
    preferredOs: profile.preferredOs || 'windows',
    primaryUseCase: profile.primaryUseCase || 'UI/UX & Prototyping',
    referralSource: profile.referralSource || 'Product Launch',

    // Entitlement & Queue Status
    status: profile.status || (profile.remoteAccountId ? 'active' : 'approved'),
    waitlistNumber: profile.waitlistNumber ?? (profile.remoteAccountId ? 14 : 1)
  }
}

const accountsList = computed<UserAccount[]>(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  profileRevision.value
  const profiles = listLocalProfiles()
  if (profiles.length === 0) {
    return [
      {
        id: 'local-default',
        name: 'Local Workspace',
        email: 'local@workspace.profile',
        role: 'designer',
        planId: 'plan-starter',
        emailVerified: false,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        userType: 'student',
        institution: 'Nexus Design Academy',
        facultyMajor: 'Interface & System Design',
        graduationYear: 2026,
        preferredOs: 'windows',
        primaryUseCase: 'UI/UX & Prototyping',
        status: 'active',
        waitlistNumber: 1
      }
    ]
  }
  return profiles.map(profileToUserAccount)
})

const currentUser = computed<UserAccount>(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  profileRevision.value
  const active = getActiveProfile()
  if (active) return profileToUserAccount(active)

  const linked = readLinkedAccountSession()
  if (linked) {
    return {
      id: linked.accountId,
      name: linked.email.split('@')[0] || 'User',
      email: linked.email,
      role: linked.email.toLowerCase().includes('admin') ? 'admin' : 'designer',
      planId: 'plan-starter',
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      userType: 'student',
      institution: 'Nexus Design Academy',
      facultyMajor: 'Interface & System Design',
      graduationYear: 2026,
      preferredOs: 'windows',
      primaryUseCase: 'UI/UX & Prototyping',
      status: 'active',
      waitlistNumber: 14
    }
  }

  return accountsList.value[0]
})

const isAuthenticated = computed(() => {
  const linked = readLinkedAccountSession()
  return Boolean(linked?.accessToken || getActiveProfile())
})

function openAuthModal(view: AuthViewMode = 'signin') {
  activeAuthView.value = view
  isAuthModalOpen.value = true
}

function closeAuthModal() {
  isAuthModalOpen.value = false
}

function openProfileModal() {
  isProfileModalOpen.value = true
}

function closeProfileModal() {
  isProfileModalOpen.value = false
}

async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password.trim()) {
    return { success: false, message: 'Please enter both email and password.' }
  }

  try {
    const { session, user } = await loginLinkedAccount(normalizedEmail, password)

    // Clean up any stale mock profiles on login with real account
    const cleanedProfiles = listLocalProfiles().filter(
      (p) => (!p.email || p.email !== 'mohamed@example.com') && p.id !== 'local-default' && p.kind !== 'guest'
    )
    replaceLocalProfiles(cleanedProfiles)

    linkRemoteAccount(session.accountId, user.name, session.email, {
      userType: (user.user_type as UserType) || 'student',
      institution: user.institution || undefined,
      facultyMajor: user.faculty_major || undefined,
      graduationYear: user.graduation_year || 2026,
      studentIdNumber: user.student_id_number || undefined,
      currentRole: user.current_role || undefined,
      portfolioUrl: user.portfolio_url || undefined,
      preferredOs: (user.preferred_os as PreferredOS) || 'windows',
      primaryUseCase: user.primary_use_case || undefined,
      status: user.status || 'active',
      waitlistNumber: user.waitlist_number ? Number(user.waitlist_number) : 14,
      planId: user.plan_slug ? (user.plan_slug.startsWith('plan-') ? user.plan_slug : 'plan-' + user.plan_slug) : 'plan-starter'
    })
    notifyProfileChange()
    closeAuthModal()
    return { success: true, message: `Welcome back, ${user.name || session.email}!` }
  } catch (cause) {
    const errorMsg = cause instanceof Error ? cause.message : 'Authentication failed.'
    return { success: false, message: errorMsg }
  }
}

function buildRegisterPayload(
  name: string,
  email: string,
  password?: string,
  extra: Partial<UserAccount> = {}
) {
  const defaults = {
    user_type: 'student',
    institution: 'General Academy',
    faculty_major: 'Design & Engineering',
    graduation_year: new Date().getFullYear(),
    student_id_number: '',
    current_role: '',
    portfolio_url: '',
    preferred_os: 'windows',
    primary_use_case: 'UI/UX & Prototyping',
    referral_source: 'Desktop App'
  }

  return {
    name,
    email,
    password: password || 'Default@1234',
    user_type: extra.userType ?? defaults.user_type,
    institution: extra.institution ?? defaults.institution,
    faculty_major: extra.facultyMajor ?? defaults.faculty_major,
    graduation_year: extra.graduationYear ?? defaults.graduation_year,
    student_id_number: extra.studentIdNumber ?? defaults.student_id_number,
    current_role: extra.currentRole ?? defaults.current_role,
    portfolio_url: extra.portfolioUrl ?? defaults.portfolio_url,
    preferred_os: extra.preferredOs ?? defaults.preferred_os,
    primary_use_case: extra.primaryUseCase ?? defaults.primary_use_case,
    referral_source: extra.referralSource ?? defaults.referral_source
  }
}

function syncRegisteredProfile(
  name: string,
  email: string,
  waitlistNumber?: number,
  userId?: string | number,
  extra?: Partial<UserAccount>
) {
  const active = getActiveProfile()
  const payload = {
    name,
    email,
    waitlistNumber,
    status: 'pending',
    ...extra
  }

  if (active) {
    updateLocalProfileDetails(active.id, payload)
  } else {
    linkRemoteAccount(
      String(userId || crypto.randomUUID()),
      name,
      email,
      payload
    )
  }
  notifyProfileChange()
}

async function signUp(
  name: string,
  email: string,
  password?: string,
  _planId?: string,
  extraDetails?: Partial<UserAccount>
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = name.trim()

  if (!normalizedName || !normalizedEmail) {
    return { success: false, message: 'Please provide both your name and email.' }
  }

  try {
    const payload = buildRegisterPayload(normalizedName, normalizedEmail, password, extraDetails)
    const data = await registerLinkedAccount(payload)

    const waitlistNumber = data.waitlist_number ? Number(data.waitlist_number) : undefined
    syncRegisteredProfile(normalizedName, normalizedEmail, waitlistNumber, data.user?.id, extraDetails)

    closeAuthModal()
    return {
      success: true,
      message: `Account created successfully! Your waitlist number is #${waitlistNumber || 'live'}. You are now listed on the admin portal.`
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Network error during registration'
    return { success: false, message: errorMsg }
  }
}

function switchAccount(userId: string) {
  const profiles = listLocalProfiles()
  const matching = profiles.find((p) => p.id === userId || p.remoteAccountId === userId)
  if (matching) {
    setActiveProfile(matching.id)
    notifyProfileChange()
  }
}

function signOut() {
  clearLinkedAccountSession()
  signOutLocalProfile()
  notifyProfileChange()
}

function updateProfile(updates: Partial<UserAccount>) {
  const active = getActiveProfile()
  if (active) {
    updateLocalProfileDetails(active.id, updates)
    notifyProfileChange()
  }
}

// Auto-validate session in background on store initialization
if (IS_BROWSER && navigator.onLine) {
  void validateLinkedAccount().catch((err) => {
    console.warn('[NexDesign Auth] Background validation error:', err)
  })
}

export function useAuthStore() {
  return {
    currentUser,
    accountsList,
    isAuthenticated,
    isAuthModalOpen,
    activeAuthView,
    isProfileModalOpen,

    openAuthModal,
    closeAuthModal,
    openProfileModal,
    closeProfileModal,

    signIn,
    signUp,
    switchAccount,
    signOut,
    updateProfile,
    notifyProfileChange
  }
}
