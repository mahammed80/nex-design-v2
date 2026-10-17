import { IS_BROWSER } from '@/constants'

import { readAccountValue, removeAccountValue, writeAccountValue } from './storage'

export type AccountStatus = 'active' | 'suspended' | 'deactivated' | 'deleted'
export type AccountAccessMode = 'full' | 'offline' | 'read-only' | 'blocked'

export interface OfflineAccessLease {
  accountId: string
  deviceId: string
  status: AccountStatus
  statusVersion: number
  issuedAt: number
  expiresAt: number
  token: string
}

export interface LinkedAccountSession {
  accountId: string
  email: string
  deviceId: string
  accessToken: string
  accessTokenExpiresAt: number
  lease: OfflineAccessLease
  lastValidatedAt: number
}

export interface AccountAccessDecision {
  mode: AccountAccessMode
  reason:
    | 'active'
    | 'authentication-required'
    | 'offline'
    | 'trial-expired'
    | 'lease-expired'
    | 'suspended'
    | 'deactivated'
    | 'deleted'
}

const SESSION_KEY = 'nex-design:linked-account-session-v1'

export function readLinkedAccountSession(): LinkedAccountSession | null {
  if (!IS_BROWSER) return null
  try {
    const value: unknown = JSON.parse(readAccountValue(SESSION_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const session = value as Partial<LinkedAccountSession>
    if (
      typeof session.accountId !== 'string' ||
      typeof session.email !== 'string' ||
      typeof session.deviceId !== 'string' ||
      typeof session.lastValidatedAt !== 'number' ||
      !session.lease ||
      typeof session.lease.expiresAt !== 'number'
    ) {
      return null
    }
    return {
      accountId: session.accountId,
      email: session.email,
      deviceId: session.deviceId,
      accessToken: typeof session.accessToken === 'string' ? session.accessToken : '',
      accessTokenExpiresAt:
        typeof session.accessTokenExpiresAt === 'number' ? session.accessTokenExpiresAt : 0,
      lease: session.lease,
      lastValidatedAt: session.lastValidatedAt
    }
  } catch {
    return null
  }
}

export function saveLinkedAccountSession(session: LinkedAccountSession): void {
  if (!IS_BROWSER) return
  writeAccountValue(SESSION_KEY, JSON.stringify(session))
}

export function clearLinkedAccountSession(): void {
  if (!IS_BROWSER) return
  removeAccountValue(SESSION_KEY)
}

export function decideAccountAccess(
  session: LinkedAccountSession | null,
  online: boolean,
  now = Date.now()
): AccountAccessDecision {
  if (!session) return { mode: 'full', reason: 'active' }
  if (session.lease.status === 'suspended') return { mode: 'blocked', reason: 'suspended' }
  if (session.lease.status === 'deactivated') return { mode: 'blocked', reason: 'deactivated' }
  if (session.lease.status === 'deleted') return { mode: 'blocked', reason: 'deleted' }
  if (session.lease.expiresAt <= now) return { mode: 'read-only', reason: 'lease-expired' }
  return online ? { mode: 'full', reason: 'active' } : { mode: 'offline', reason: 'offline' }
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function importLeasePublicKey(pem: string): Promise<CryptoKey> {
  const encoded = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
  return crypto.subtle.importKey(
    'spki',
    decodeBase64Url(encoded),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
}

const DEFAULT_LEASE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcDuurM1MJE4fryWazuzFMqLcf4Ry
YDTzj+M26zcHtEfIFcbLPqfU1EhcesawFjHYQjKqKFkSYkLuW63X0DXwXA==
-----END PUBLIC KEY-----`

const LEASE_PUBLIC_KEY_STORAGE_KEY = 'nex-design:lease-public-key-v1'

let cachedLeasePublicKeyPem: string | null = null

async function resolveLeasePublicKey(): Promise<string | null> {
  const configured = import.meta.env.VITE_NEXDESIGN_OFFLINE_LEASE_PUBLIC_KEY?.trim()
  if (configured) return configured.replace(/\\n/g, '\n')

  if (IS_BROWSER) {
    const stored = readAccountValue(LEASE_PUBLIC_KEY_STORAGE_KEY)
    if (stored) return stored
  }

  if (cachedLeasePublicKeyPem) return cachedLeasePublicKeyPem

  try {
    const baseUrl =
      import.meta.env.VITE_NEXDESIGN_ACCOUNT_API?.trim() || 'https://nex-design.online/api'
    const response = await fetch(`${baseUrl}/desktop/public_key.php`, {
      signal: AbortSignal.timeout(5_000)
    })
    const envelope = (await response.json()) as {
      success?: boolean
      data?: { publicKeyPem?: string }
    }
    const publicKeyPem = envelope.data?.publicKeyPem?.trim()
    if (response.ok && publicKeyPem) {
      cachedLeasePublicKeyPem = publicKeyPem
      if (IS_BROWSER) {
        writeAccountValue(LEASE_PUBLIC_KEY_STORAGE_KEY, publicKeyPem)
      }
      return publicKeyPem
    }
  } catch (error) {
    console.warn('Failed to load the offline lease public key; using the embedded fallback', error)
  }

  return DEFAULT_LEASE_PUBLIC_KEY_PEM
}

export async function verifyOfflineLease(lease: OfflineAccessLease): Promise<boolean> {
  const publicKeyPem = await resolveLeasePublicKey()
  if (!publicKeyPem) {
    if (import.meta.env.DEV) {
      console.warn(
        '[NexDesign Auth] VITE_NEXDESIGN_OFFLINE_LEASE_PUBLIC_KEY not set; skipping cryptographic lease verification in dev mode.'
      )
      return true
    }
    return false
  }
  if (!lease.token) return false
  const parts = lease.token.split('.')
  if (parts.length !== 3) return false
  const [header, payload, signature] = parts
  try {
    const claims = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload))
    ) as OfflineAccessLease
    if (
      claims.accountId !== lease.accountId ||
      claims.deviceId !== lease.deviceId ||
      claims.status !== lease.status ||
      claims.statusVersion !== lease.statusVersion ||
      claims.issuedAt !== lease.issuedAt ||
      claims.expiresAt !== lease.expiresAt
    ) {
      return false
    }
    const publicKey = await importLeasePublicKey(publicKeyPem)
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      decodeBase64Url(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    )
  } catch {
    return false
  }
}
