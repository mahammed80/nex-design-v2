import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { UserAccount, AuthViewMode } from './types'
import { subscribersStorage } from '@/app/admin/db'
import { sendEmail } from '@/app/email/service'

const ACCOUNTS_STORAGE_KEY = 'nex-design:auth:accounts'
const ACTIVE_USER_ID_KEY = 'nex-design:auth:active-user-id'

const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-admin-1',
    name: 'Mohamed Ahmed',
    email: 'mohamed@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    role: 'admin',
    planId: 'plan-pro',
    emailVerified: true,
    createdAt: Date.now() - 86400000 * 90,
    lastLoginAt: Date.now()
  },
  {
    id: 'user-designer-2',
    name: 'Sarah Chen',
    email: 'sarah.c@designstudio.io',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    role: 'designer',
    planId: 'plan-team',
    emailVerified: true,
    createdAt: Date.now() - 86400000 * 150,
    lastLoginAt: Date.now() - 3600000
  }
]

export const storedAccounts = useLocalStorage<UserAccount[]>(ACCOUNTS_STORAGE_KEY, DEFAULT_ACCOUNTS)
export const storedActiveUserId = useLocalStorage<string>(ACTIVE_USER_ID_KEY, DEFAULT_ACCOUNTS[0].id)

const isAuthModalOpen = ref(false)
const activeAuthView = ref<AuthViewMode>('signin')
const isProfileModalOpen = ref(false)

const currentUser = computed<UserAccount>(() => {
  const found = storedAccounts.value.find((acc) => acc.id === storedActiveUserId.value)
  if (found) return found
  return storedAccounts.value[0] || DEFAULT_ACCOUNTS[0]
})

const isAuthenticated = computed(() => !!currentUser.value)

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

function signIn(email: string, password: string): { success: boolean; message: string } {
  if (!email.trim() || !password.trim()) {
    return { success: false, message: 'Please enter both email and password.' }
  }

  const existing = storedAccounts.value.find(
    (acc) => acc.email.toLowerCase() === email.toLowerCase().trim()
  )

  if (existing) {
    existing.lastLoginAt = Date.now()
    storedActiveUserId.value = existing.id
    closeAuthModal()
    return { success: true, message: `Welcome back, ${existing.name}!` }
  }

  // Auto-generate account for seamless login demo
  const nameFromEmail = email.split('@')[0]
  const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1)
  return signUp(formattedName, email, password, 'plan-pro')
}

function signUp(
  name: string,
  email: string,
  _password: string,
  planId: string = 'plan-pro'
): { success: boolean; message: string } {
  if (!name.trim() || !email.trim()) {
    return { success: false, message: 'Please provide both your name and email.' }
  }

  const existingIndex = storedAccounts.value.findIndex(
    (acc) => acc.email.toLowerCase() === email.toLowerCase().trim()
  )

  if (existingIndex !== -1) {
    storedActiveUserId.value = storedAccounts.value[existingIndex].id
    closeAuthModal()
    return { success: true, message: `Switched to existing account for ${email}` }
  }

  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const id = `user-${hex}`

  const newAccount: UserAccount = {
    id,
    name: name.trim(),
    email: email.trim(),
    role: email.toLowerCase().includes('admin') ? 'admin' : 'designer',
    planId,
    emailVerified: true,
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  }

  storedAccounts.value.push(newAccount)
  storedActiveUserId.value = id

  // Register in Admin subscribers list automatically
  const existingSubIndex = subscribersStorage.value.findIndex((s) => s.userEmail === newAccount.email)
  if (existingSubIndex === -1) {
    subscribersStorage.value.push({
      id: `sub-${hex}`,
      userName: newAccount.name,
      userEmail: newAccount.email,
      avatar: newAccount.avatar,
      planId: newAccount.planId,
      status: 'active',
      billingCycle: 'monthly',
      nextBillingDate: Date.now() + 86400000 * 30,
      storageUsedGb: 0,
      aiCreditsUsed: 0,
      createdAt: Date.now()
    })
  }

  // Dispatch welcome email
  try {
    sendEmail('welcome_signup', newAccount.email, newAccount.name)
  } catch (e) {
    console.warn('Failed to send welcome email', e)
  }

  closeAuthModal()
  return { success: true, message: `Account created successfully! Welcome to NexDesign, ${name}.` }
}

function switchAccount(userId: string) {
  const target = storedAccounts.value.find((acc) => acc.id === userId)
  if (target) {
    target.lastLoginAt = Date.now()
    storedActiveUserId.value = target.id
  }
}

function signOut(userId?: string) {
  const targetId = userId || storedActiveUserId.value
  storedAccounts.value = storedAccounts.value.filter((acc) => acc.id !== targetId)

  if (storedAccounts.value.length > 0) {
    storedActiveUserId.value = storedAccounts.value[0].id
  } else {
    // Re-seed default demo account if all are signed out
    storedAccounts.value = [...DEFAULT_ACCOUNTS]
    storedActiveUserId.value = DEFAULT_ACCOUNTS[0].id
    openAuthModal('signin')
  }
}

function updateProfile(updates: Partial<UserAccount>) {
  const index = storedAccounts.value.findIndex((acc) => acc.id === storedActiveUserId.value)
  if (index !== -1) {
    storedAccounts.value[index] = { ...storedAccounts.value[index], ...updates }
  }
}

export function useAuthStore() {
  return {
    currentUser,
    accountsList: storedAccounts,
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
    updateProfile
  }
}
