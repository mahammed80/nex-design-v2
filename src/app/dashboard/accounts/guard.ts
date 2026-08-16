import {
  decideAccountAccess,
  readLinkedAccountSession,
  verifyOfflineLease,
  type AccountAccessDecision
} from './access'
import { isAccountApiConfigured, validateLinkedAccount } from './api'

export async function resolveAccountAccess(): Promise<AccountAccessDecision> {
  let session = readLinkedAccountSession()
  let validatedOnline = false
  if (session && navigator.onLine) {
    try {
      if (isAccountApiConfigured()) {
        session = await validateLinkedAccount()
        validatedOnline = true
      }
    } catch (error) {
      console.warn('Account status could not be refreshed; using the cached offline lease', error)
    }
  }
  if (session && !validatedOnline) {
    if (!(await verifyOfflineLease(session.lease))) {
      return { mode: 'read-only', reason: 'lease-expired' }
    }
    return decideAccountAccess(session, false)
  }
  return decideAccountAccess(session, validatedOnline)
}
