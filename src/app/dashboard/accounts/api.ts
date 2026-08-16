import {
  clearLinkedAccountSession,
  readLinkedAccountSession,
  saveLinkedAccountSession,
  verifyOfflineLease,
  type AccountStatus,
  type LinkedAccountSession,
  type OfflineAccessLease
} from './access'

interface AccountStatusResponse {
  accountId: string
  email: string
  status: AccountStatus
  statusVersion: number
  offlineLease: OfflineAccessLease
}

const configuredBaseUrl = import.meta.env.VITE_NEXDESIGN_ACCOUNT_API?.trim()

export function isAccountApiConfigured(): boolean {
  return Boolean(configuredBaseUrl)
}

export async function validateLinkedAccount(): Promise<LinkedAccountSession | null> {
  const current = readLinkedAccountSession()
  if (!current || !configuredBaseUrl || !navigator.onLine) return current

  const response = await fetch(`${configuredBaseUrl}/account/status`, {
    credentials: 'include',
    headers: { 'X-NexDesign-Device': current.deviceId },
    signal: AbortSignal.timeout(10_000)
  })
  if (response.status === 401) {
    clearLinkedAccountSession()
    return null
  }
  const result = (await response.json()) as AccountStatusResponse
  if (!response.ok) throw new Error(`Account validation failed (${response.status})`)
  if (!(await verifyOfflineLease(result.offlineLease))) {
    throw new Error('The server returned an invalid offline access lease')
  }
  const session: LinkedAccountSession = {
    accountId: result.accountId,
    email: result.email,
    deviceId: current.deviceId,
    lease: { ...result.offlineLease, status: result.status, statusVersion: result.statusVersion },
    lastValidatedAt: Date.now()
  }
  saveLinkedAccountSession(session)
  return session
}
