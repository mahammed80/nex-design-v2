import {
  decideAccountAccess,
  readLinkedAccountSession,
  verifyOfflineLease,
  type AccountAccessDecision
} from './access'
import { isAccountApiConfigured, validateLinkedAccount } from './api'
import { getActiveProfile, getGuestTrialStatus } from './session'

export async function resolveAccountAccess(): Promise<AccountAccessDecision> {
  const activeProfile = getActiveProfile()
  const guestTrial = getGuestTrialStatus(activeProfile)
  if (guestTrial && !guestTrial.active) {
    return { mode: 'read-only', reason: 'trial-expired' }
  }

  let session = readLinkedAccountSession()
  let validatedOnline = false
  if (session && session.accessToken && navigator.onLine) {
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
  if (!session && activeProfile?.remoteAccountId) {
    return { mode: 'read-only', reason: 'authentication-required' }
  }
  return decideAccountAccess(session, validatedOnline)
}
