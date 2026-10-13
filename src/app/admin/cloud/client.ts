import { ACCOUNT_API_DEFAULT_BASE, ADMIN_API_TIMEOUT_MS } from '@/constants'

import { clearAdminToken, readAdminToken, saveAdminToken } from './session'
import type {
  AdminIdentity,
  CloudBulkUpdate,
  CloudBulkUpdateResult,
  CloudPagination,
  CloudStats,
  CloudUser,
  CloudUserFilters,
  CloudUserUpdate,
  CloudUserUpdateResult
} from './types'

/**
 * Client for the live admin API (nex-design Website `public/api`). Auth is a Bearer token:
 * the site's PHP session cookie is `SameSite=Lax`, so browsers never send it on cross-site
 * requests from `tauri://localhost` / `localhost:1420` — `credentials: 'include'` cannot work.
 */

export const ADMIN_API_BASE = (
  import.meta.env.VITE_NEXDESIGN_ACCOUNT_API?.trim() || ACCOUNT_API_DEFAULT_BASE
).replace(/\/+$/, '')

export type AdminApiErrorKind = 'unauthorized' | 'forbidden' | 'network' | 'server'

export class AdminApiError extends Error {
  constructor(
    readonly kind: AdminApiErrorKind,
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

interface Envelope<T> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

function errorKind(status: number): AdminApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  return 'server'
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const token = readAdminToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  try {
    return await fetch(`${ADMIN_API_BASE}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(ADMIN_API_TIMEOUT_MS)
    })
  } catch (error) {
    throw new AdminApiError(
      'network',
      `Could not reach ${new URL(ADMIN_API_BASE).host}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init)
  let envelope: Envelope<T>
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    throw new AdminApiError(
      'server',
      `Unexpected response (HTTP ${response.status})`,
      response.status
    )
  }
  if (!response.ok || !envelope.success) {
    const kind = response.ok ? 'server' : errorKind(response.status)
    if (kind === 'unauthorized') clearAdminToken()
    throw new AdminApiError(
      kind,
      envelope.error || envelope.message || `Request failed (HTTP ${response.status})`,
      response.status
    )
  }
  return envelope.data as T
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function isAdmin(user: AdminIdentity | null | undefined): user is AdminIdentity {
  return user?.role === 'admin'
}

/** The signed-in administrator, or null when there is no valid admin token. */
export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  if (!readAdminToken()) return null
  const response = await send('/auth/me.php')
  const envelope = (await response.json().catch(() => ({}))) as Envelope<{
    user?: AdminIdentity
  }>
  const user = envelope.data?.user
  if (isAdmin(user)) return user
  // A valid-looking token that the server no longer accepts (expired, revoked, demoted).
  clearAdminToken()
  return null
}

export async function signInAdmin(email: string, password: string): Promise<AdminIdentity> {
  const data = await postJson<{ user?: AdminIdentity; token?: string }>('/auth/login.php', {
    email,
    password
  })
  if (!isAdmin(data.user)) {
    throw new AdminApiError('forbidden', 'This account does not have administrator access.')
  }
  if (!data.token) throw new AdminApiError('server', 'The server did not return an access token.')
  saveAdminToken(data.token)
  return data.user
}

export async function signOutAdmin(): Promise<void> {
  clearAdminToken()
  // Ends any same-origin session too; the token itself expires server-side via `exp`.
  await send('/auth/logout.php').catch((error: unknown) =>
    console.warn('[NexDesign Admin] Logout request failed', error)
  )
}

export function fetchCloudStats(): Promise<CloudStats> {
  return request<CloudStats>('/admin/stats.php')
}

export function fetchCloudUsers(
  filters: CloudUserFilters,
  page = 1,
  limit = 25
): Promise<{ users: CloudUser[]; pagination: CloudPagination }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  return request(`/admin/users.php?${params.toString()}`)
}

export function updateCloudUser(
  userId: number,
  update: CloudUserUpdate
): Promise<CloudUserUpdateResult> {
  return postJson('/admin/update_user.php', { user_id: userId, ...update })
}

export function bulkUpdateCloudUsers(
  userIds: number[],
  update: CloudBulkUpdate
): Promise<CloudBulkUpdateResult> {
  return postJson('/admin/update_user.php', { user_ids: userIds, ...update })
}

/** Download the full user export as CSV (fetched with the Bearer token, then saved locally). */
export async function downloadCloudUsersCsv(): Promise<void> {
  const response = await send('/admin/export_csv.php')
  if (!response.ok) {
    if (response.status === 401) clearAdminToken()
    throw new AdminApiError(errorKind(response.status), `Export failed (HTTP ${response.status})`)
  }
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `nex_design_users_${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}
