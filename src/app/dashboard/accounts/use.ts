import { ref } from 'vue'

import { clearLinkedAccountSession } from './access'
import {
  createLocalProfile,
  getActiveProfile,
  listLocalProfiles,
  renameLocalProfile,
  setActiveProfile,
  signOutLocalProfile
} from './session'

export function useDashboardAccounts() {
  const activeProfile = getActiveProfile()
  const activeAccount = ref(activeProfile?.name ?? '')
  const accounts = ref(listLocalProfiles().map((profile) => profile.name))

  function switchAccount(name: string) {
    const profile = listLocalProfiles().find((item) => item.name === name)
    if (!profile) return
    setActiveProfile(profile.id)
    activeAccount.value = profile.name
  }

  function addAccount(name: string): boolean {
    try {
      const profile = createLocalProfile(name)
      accounts.value = listLocalProfiles().map((item) => item.name)
      activeAccount.value = profile.name
      return true
    } catch {
      return false
    }
  }

  function renameActiveAccount(name: string): boolean {
    const profile = getActiveProfile()
    if (!profile || !renameLocalProfile(profile.id, name)) return false
    activeAccount.value = name.trim()
    accounts.value = listLocalProfiles().map((item) => item.name)
    return true
  }

  return {
    accounts,
    activeAccount,
    addAccount,
    renameActiveAccount,
    signOut: () => {
      clearLinkedAccountSession()
      signOutLocalProfile()
    },
    switchAccount
  }
}
