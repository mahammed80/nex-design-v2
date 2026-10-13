import { IS_BROWSER, IS_TAURI } from '@nex-design/core/constants'
import {
  clearLinkedAccountSession,
  readLinkedAccountSession,
  saveLinkedAccountSession,
  verifyOfflineLease,
  type AccountStatus,
  type LinkedAccountSession,
  type OfflineAccessLease
} from './access'
import { readAccountValue, writeAccountValue } from './storage'

interface AccountStatusResponse {
  accountId: string
  email: string
  status: AccountStatus
  statusVersion: number
  offlineLease: OfflineAccessLease
}

export interface RemoteUserProfile {
  accountId: string
  name: string
  email: string
  status: AccountStatus
  user_type?: string
  institution?: string
  faculty_major?: string
  graduation_year?: number
  student_id_number?: string
  current_role?: string
  portfolio_url?: string
  preferred_os?: string
  primary_use_case?: string
  waitlist_number?: number
  plan_slug?: string
  plan_name?: string
  license_key?: string
}

interface DesktopLoginResponse {
  accessToken: string
  accessTokenExpiresAt: number
  user: RemoteUserProfile
  offlineLease: OfflineAccessLease
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface RegisterAccountPayload {
  name: string
  email: string
  password: string
  user_type: string
  institution: string
  faculty_major: string
  graduation_year: number
  student_id_number: string
  current_role: string
  portfolio_url: string
  preferred_os: string
  primary_use_case: string
  referral_source: string
}

export interface RegisterAccountResult {
  waitlist_number?: number
  user?: { id: number | string }
}

const configuredBaseUrl =
  import.meta.env.VITE_NEXDESIGN_ACCOUNT_API?.trim() ||
  (import.meta.env.DEV && IS_BROWSER && window.location.hostname === 'localhost' && !IS_TAURI
    ? '/api'
    : 'https://nex-design.online/api')

export function getOrCreateDeviceId(): string {
  const deviceKey = 'nex-design:device-id-v1'
  let deviceId = readAccountValue(deviceKey)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    writeAccountValue(deviceKey, deviceId)
  }
  return deviceId
}

export function isAccountApiConfigured(): boolean {
  return Boolean(configuredBaseUrl)
}

export async function validateLinkedAccount(): Promise<LinkedAccountSession | null> {
  const current = readLinkedAccountSession()
  if (!current || !configuredBaseUrl || !navigator.onLine) return current

  const response = await fetch(`${configuredBaseUrl}/account/status.php`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${current.accessToken}`, 'X-NexDesign-Device': current.deviceId },
    signal: AbortSignal.timeout(10_000)
  })
  if (response.status === 401) {
    clearLinkedAccountSession()
    return null
  }
  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<AccountStatusResponse>
  const result = envelope.data
  if (!response.ok) {
    throw new Error(envelope.error ?? envelope.message ?? `Account validation failed (${response.status})`)
  }
  if (!result) throw new Error(envelope.error ?? envelope.message ?? 'Account validation returned no data')
  if (!(await verifyOfflineLease(result.offlineLease))) {
    throw new Error('The server returned an invalid offline access lease')
  }
  const session: LinkedAccountSession = {
    accountId: result.accountId,
    email: result.email,
    deviceId: current.deviceId,
    accessToken: current.accessToken,
    accessTokenExpiresAt: current.accessTokenExpiresAt,
    lease: { ...result.offlineLease, status: result.status, statusVersion: result.statusVersion },
    lastValidatedAt: Date.now()
  }
  saveLinkedAccountSession(session)
  return session
}

export async function loginLinkedAccount(
  email: string,
  password: string
): Promise<{ session: LinkedAccountSession; user: RemoteUserProfile }> {
  if (!configuredBaseUrl) throw new Error('The NexDesign account API is not configured')
  const deviceId = getOrCreateDeviceId()
  const response = await fetch(`${configuredBaseUrl}/desktop/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId }),
    signal: AbortSignal.timeout(10_000)
  })
  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<DesktopLoginResponse>
  if (!response.ok || !envelope.data) {
    throw new Error(envelope.error ?? envelope.message ?? `Login failed (${response.status})`)
  }
  const result = envelope.data
  if (!(await verifyOfflineLease(result.offlineLease))) {
    throw new Error('The server returned an invalid offline access lease')
  }
  const session: LinkedAccountSession = {
    accountId: result.user.accountId,
    email: result.user.email,
    deviceId,
    accessToken: result.accessToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt,
    lease: result.offlineLease,
    lastValidatedAt: Date.now()
  }
  saveLinkedAccountSession(session)
  return { session, user: result.user }
}

export async function registerLinkedAccount(
  payload: RegisterAccountPayload
): Promise<RegisterAccountResult> {
  if (!configuredBaseUrl) throw new Error('The NexDesign account API is not configured')
  const response = await fetch(`${configuredBaseUrl}/auth/register.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000)
  })
  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<RegisterAccountResult> &
    RegisterAccountResult
  if (!response.ok || envelope.success === false) {
    throw new Error(envelope.error ?? envelope.message ?? `Registration failed (${response.status})`)
  }
  return envelope.data ?? {
    waitlist_number: envelope.waitlist_number,
    user: envelope.user
  }
}

export async function verifyStandaloneLicense(licenseKey: string): Promise<{ valid: boolean; tier?: string; reason?: string }> {
  if (!configuredBaseUrl) throw new Error('The NexDesign account API is not configured')
  const deviceId = getOrCreateDeviceId()
  const response = await fetch(`${configuredBaseUrl}/desktop/verify_license.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, licenseKey, deviceId }),
    signal: AbortSignal.timeout(10_000)
  })
  const json = (await response.json().catch(() => ({}))) as {
    success?: boolean
    valid?: boolean
    tier?: string
    error?: string
    reason?: string
  }
  return {
    valid: Boolean(json.valid ?? json.success),
    tier: json.tier,
    reason: json.reason ?? json.error
  }
}
