import { useFilter } from 'reka-ui'
import { computed, ref, watch } from 'vue'

import type { FontProviderId } from '@nex-design/core/text'

export type FontAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied'

export interface FontAccessController {
  state: () => FontAccessState
  load: () => Promise<string[]>
}

export interface FontFamilyEntry {
  family: string
  provider?: FontProviderId
}

/**
 * Options for {@link useFontPicker}.
 */
export interface UseFontPickerOptions {
  /** Writable model for the selected font family. */
  modelValue: { value: string }
  /** Async source for available font families. */
  listFamilies: () => Promise<string[]>
  /** Optional map of family → provider ID for provider badges and filtering. */
  providerMap?: Record<string, FontProviderId>
  /** Host-provided local-font permission controller. */
  localFontAccess?: FontAccessController
  /** Optional callback fired after a family is selected. */
  onSelect?: (family: string) => void
}

/**
 * Returns searchable font-picker state and selection helpers.
 */
export function useFontPicker(options: UseFontPickerOptions) {
  const families = ref<string[]>([])
  const searchTerm = ref('')
  const open = ref(false)
  const loading = ref(false)
  const accessState = ref<FontAccessState>(options.localFontAccess?.state() ?? 'granted')
  const providerFilter = ref<FontProviderId | 'all'>('all')

  const { contains } = useFilter({ sensitivity: 'base' })

  const providerList = computed<FontProviderId[]>(() => {
    if (!options.providerMap) return []
    const providers = new Set(Object.values(options.providerMap))
    return ['all', ...providers] as FontProviderId[]
  })

  const filtered = computed(() => {
    let list = families.value
    if (providerFilter.value !== 'all' && options.providerMap) {
      const map = options.providerMap
      list = list.filter((family) => map[family] === providerFilter.value)
    }
    if (!searchTerm.value) return list
    return list.filter((family) => contains(family, searchTerm.value))
  })

  async function loadFamilies() {
    if (families.value.length > 0 || loading.value) return
    loading.value = true
    try {
      families.value = await options.listFamilies()
      accessState.value = options.localFontAccess?.state() ?? accessState.value
    } finally {
      loading.value = false
    }
  }

  watch(open, async (isOpen) => {
    if (!isOpen) return
    searchTerm.value = ''
    providerFilter.value = 'all'
    accessState.value = options.localFontAccess?.state() ?? accessState.value
    await loadFamilies()
  })

  async function requestAccess() {
    if (!options.localFontAccess || loading.value) return
    loading.value = true
    try {
      families.value = await options.localFontAccess.load()
      accessState.value = options.localFontAccess.state()
    } finally {
      loading.value = false
    }
  }

  function select(family: string) {
    options.modelValue.value = family
    options.onSelect?.(family)
    open.value = false
  }

  function setProviderFilter(filter: FontProviderId | 'all') {
    providerFilter.value = filter
  }

  return {
    families,
    searchTerm,
    open,
    filtered,
    loading,
    accessState,
    providerFilter,
    providerList,
    requestAccess,
    select,
    setProviderFilter
  }
}
