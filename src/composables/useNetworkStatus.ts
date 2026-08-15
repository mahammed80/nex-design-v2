import { ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'

export interface NetworkToastEvent {
  id: string
  type: 'offline' | 'online_syncing' | 'online_synced'
  title: string
  message: string
  timestamp: number
}

const isOnline = useOnline()
const networkToast = ref<NetworkToastEvent | null>(null)
const isSyncingOfflineEdits = ref(false)

let hasInitialized = false

watch(
  isOnline,
  (online) => {
    if (!hasInitialized) {
      hasInitialized = true
      return
    }

    const id = `toast-${Date.now()}`

    if (!online) {
      networkToast.value = {
        id,
        type: 'offline',
        title: 'Network Disconnected',
        message: 'You are now offline. All changes are saved locally to your PC.',
        timestamp: Date.now()
      }
    } else {
      isSyncingOfflineEdits.value = true
      networkToast.value = {
        id,
        type: 'online_syncing',
        title: 'Connection Restored',
        message: 'Back online! Reconciling offline edits with Cloud...',
        timestamp: Date.now()
      }

      // Simulate background Yjs CRDT reconciliation completion
      setTimeout(() => {
        isSyncingOfflineEdits.value = false
        networkToast.value = {
          id: `toast-${Date.now()}`,
          type: 'online_synced',
          title: 'Sync Complete',
          message: 'All offline changes successfully synced to Cloud.',
          timestamp: Date.now()
        }

        // Auto dismiss after 4 seconds
        setTimeout(() => {
          if (networkToast.value?.id === id || networkToast.value?.type === 'online_synced') {
            networkToast.value = null
          }
        }, 4000)
      }, 1500)
    }
  },
  { immediate: true }
)

export function dismissNetworkToast() {
  networkToast.value = null
}

export function useNetworkStatus() {
  return {
    isOnline,
    networkToast,
    isSyncingOfflineEdits,
    dismissNetworkToast
  }
}
