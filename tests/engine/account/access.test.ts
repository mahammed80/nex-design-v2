import { describe, expect, test } from 'bun:test'

import {
  decideAccountAccess,
  type AccountStatus,
  type LinkedAccountSession
} from '@/app/dashboard/accounts/access'

function session(status: AccountStatus, expiresAt: number): LinkedAccountSession {
  return {
    accountId: 'account-1',
    email: 'designer@example.com',
    deviceId: 'device-1',
    lastValidatedAt: 1_000,
    lease: {
      accountId: 'account-1',
      deviceId: 'device-1',
      status,
      statusVersion: 1,
      issuedAt: 1_000,
      expiresAt,
      token: 'server-issued-lease'
    }
  }
}

describe('offline account access', () => {
  test('local-only profiles retain full access', () => {
    expect(decideAccountAccess(null, false, 2_000)).toEqual({ mode: 'full', reason: 'active' })
  })

  test('active linked accounts can edit within their offline lease', () => {
    expect(decideAccountAccess(session('active', 10_000), false, 2_000)).toEqual({
      mode: 'offline',
      reason: 'offline'
    })
  })

  test('expired offline leases become read-only', () => {
    expect(decideAccountAccess(session('active', 2_000), false, 2_000)).toEqual({
      mode: 'read-only',
      reason: 'lease-expired'
    })
  })

  test.each(['suspended', 'deactivated', 'deleted'] as const)(
    '%s accounts are blocked even with an unexpired lease',
    (status) => {
      expect(decideAccountAccess(session(status, 10_000), false, 2_000)).toEqual({
        mode: 'blocked',
        reason: status
      })
    }
  )
})
