export type UserRole = 'admin' | 'designer' | 'viewer'
export type UserType = 'student' | 'graduate' | 'professional'
export type PreferredOS = 'windows' | 'mac_arm' | 'mac_intel' | 'linux'

export interface UserAccount {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  planId: string // e.g. 'plan-starter', 'plan-pro', 'plan-enterprise', 'plan-guest'
  emailVerified: boolean
  createdAt: number
  lastLoginAt: number

  // Academic & Professional Profile (nex-design.online)
  userType?: UserType
  institution?: string
  facultyMajor?: string
  graduationYear?: number
  studentIdNumber?: string
  currentRole?: string
  portfolioUrl?: string

  // Environment & Preferences
  preferredOs?: PreferredOS
  primaryUseCase?: string
  referralSource?: string

  // Entitlements & Queue Status
  status?: string // 'active' | 'invited_to_beta' | 'pending' | 'suspended' | 'approved'
  waitlistNumber?: number
}

export interface AuthSession {
  token: string
  user: UserAccount
  expiresAt: number
}

export type AuthViewMode = 'signin' | 'signup' | 'forgot_password'
