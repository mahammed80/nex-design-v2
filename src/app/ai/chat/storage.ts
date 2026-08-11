import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { AI_PROVIDERS } from '@nex-design/core/constants'
import type { AIProviderID } from '@nex-design/core/constants'
import { setPexelsApiKey, setUnsplashAccessKey } from '@nex-design/core/tools'

import { getPoolsideProxyBaseUrl, POOLSIDE_MODEL_ID } from '@/app/ai/poolside'

const STORAGE_PREFIX = 'nex-design:'
export const providerID = ref<AIProviderID>('openai-compatible')
export const apiKey = ref('server-managed')
export const modelID = ref(POOLSIDE_MODEL_ID)
export const customBaseURL = ref(getPoolsideProxyBaseUrl())
export const customModelID = ref(POOLSIDE_MODEL_ID)
export const customAPIType = ref<'completions' | 'responses'>('completions')
export const maxOutputTokens = useLocalStorage(`${STORAGE_PREFIX}ai-max-output-tokens`, 16384)
export const pexelsApiKey = useLocalStorage(`${STORAGE_PREFIX}pexels-api-key`, '')
export const unsplashAccessKey = useLocalStorage(`${STORAGE_PREFIX}unsplash-access-key`, '')

export const providerDef = computed(
  () => AI_PROVIDERS.find((provider) => provider.id === 'openai-compatible') ?? AI_PROVIDERS[0]
)

export const isACPProvider = computed(() => false)
export const isConfigured = computed(() => true)

export function setAPIKey(_key: string) {
  apiKey.value = 'server-managed'
}

export function registerAIChatEffects(markTransportDirty: () => void) {
  watch(
    pexelsApiKey,
    (key) => {
      setPexelsApiKey(key || null)
    },
    { immediate: true }
  )

  watch(
    unsplashAccessKey,
    (key) => {
      setUnsplashAccessKey(key || null)
    },
    { immediate: true }
  )

  void markTransportDirty
}
