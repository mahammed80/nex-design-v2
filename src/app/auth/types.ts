export type UserRole = 'admin' | 'designer' | 'viewer'

export interface UserAccount {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  planId: string // e.g. 'plan-free', 'plan-pro', 'plan-team', 'plan-enterprise'
  emailVerified: boolean
  createdAt: number
  lastLoginAt: number
}

export interface AuthSession {
  token: string
  user: UserAccount
  expiresAt: number
}

export type AuthViewMode = 'signin' | 'signup' | 'forgot_password'
