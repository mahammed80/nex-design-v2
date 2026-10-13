import {
  readAccountValue,
  removeAccountValue,
  writeAccountValue
} from '@/app/dashboard/accounts/storage'

/** HS256 admin token issued by `/auth/login.php` (30-day `exp`). */
const ADMIN_TOKEN_KEY = 'nex-design:admin-token-v1'
/** Keys written by earlier builds of the admin view; cleared on sign-out. */
const LEGACY_TOKEN_KEYS = ['nex_admin_token', 'nex_auth_token']

function tokenExpiry(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims: unknown = JSON.parse(json)
    if (claims && typeof claims === 'object' && 'exp' in claims && typeof claims.exp === 'number') {
      return claims.exp * 1000
    }
  } catch (error) {
    console.warn('[NexDesign Admin] Ignoring malformed admin token', error)
  }
  return null
}

/** The stored admin token, or null when missing or past its `exp`. */
export function readAdminToken(now = Date.now()): string | null {
  const token = readAccountValue(ADMIN_TOKEN_KEY) ?? readAccountValue(LEGACY_TOKEN_KEYS[0])
  if (!token) return null
  const expiresAt = tokenExpiry(token)
  if (expiresAt === null || expiresAt <= now) {
    clearAdminToken()
    return null
  }
  return token
}

export function saveAdminToken(token: string): void {
  writeAccountValue(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  removeAccountValue(ADMIN_TOKEN_KEY)
  for (const key of LEGACY_TOKEN_KEYS) removeAccountValue(key)
}
