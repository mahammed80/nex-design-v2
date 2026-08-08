<script setup lang="ts">
import { nextTick } from 'vue'
import { templateRef, unrefElement } from '@vueuse/core'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
  type AcceptableValue
} from 'reka-ui'

import { useFontPicker, type FontAccessController } from '#vue/primitives/FontPicker/useFontPicker'

import type { FontPickerUi } from '#vue/primitives/FontPicker/types'
import type { FontProviderId } from '@nex-design/core/text'

const {
  listFamilies,
  localFontAccess,
  ui,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  providerMap
} = defineProps<{
  listFamilies: () => Promise<string[]>
  localFontAccess?: FontAccessController
  ui?: FontPickerUi
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  providerMap?: Record<string, FontProviderId>
}>()

const modelValue = defineModel<string>({ required: true })
const emit = defineEmits<{ select: [family: string] }>()

const contentRef = templateRef<HTMLElement>('contentRef')

function focusSearchInput() {
  nextTick(() => {
    const content = unrefElement(contentRef)
    if (!(content instanceof HTMLElement)) return
    content.querySelector<HTMLInputElement>('input')?.focus()
  })
}

const {
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
} = useFontPicker({
  modelValue,
  listFamilies,
  localFontAccess,
  providerMap,
  onSelect: (family) => emit('select', family)
})

const PROVIDER_LABELS: Record<string, string> = {
  bundled: 'Bundled',
  fontsource: 'Fontsource',
  system: 'System'
}
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    :model-value="modelValue"
    :ignore-filter="true"
    @update:model-value="
      (v: AcceptableValue) => {
        if (typeof v === 'string') select(v)
      }
    "
  >
    <ComboboxAnchor as-child @click="open = !open">
      <slot name="trigger" :value="modelValue" :open="open">
        <button :class="ui?.trigger">
          <span class="truncate">{{ modelValue }}</span>
        </button>
      </slot>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        :side-offset="2"
        align="start"
        position="popper"
        :class="ui?.content"
        @open-auto-focus.prevent
        ref="contentRef"
        @vue:mounted="focusSearchInput"
      >
        <slot name="search" :search-term="searchTerm">
          <ComboboxInput
            v-model="searchTerm"
            :class="ui?.search"
            placeholder="Search fonts…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </slot>

        <div
          v-if="providerList.length > 1"
          :class="ui?.providerFilter ?? 'flex gap-1 border-b border-border px-2 py-1.5'"
        >
          <button
            v-for="p in providerList"
            :key="p"
            type="button"
            :class="
              ui?.providerFilterBtn ??
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors'
            "
            :data-active="providerFilter === p ? '' : undefined"
            @click="setProviderFilter(p)"
          >
            {{ (p as string) === 'all' ? 'All' : (PROVIDER_LABELS[p] ?? p) }}
          </button>
        </div>

        <ComboboxViewport :class="ui?.viewport ?? 'max-h-72 overflow-y-auto'">
          <ComboboxItem
            v-for="option in filtered"
            :key="option"
            :value="option"
            :class="ui?.item"
            :style="{ fontFamily: `'${option}', sans-serif` }"
          >
            <slot name="item" :family="option" :selected="option === modelValue">
              <ComboboxItemIndicator>
                <slot name="indicator" :selected="option === modelValue" />
              </ComboboxItemIndicator>
              <span class="truncate">{{ option }}</span>
              <span
                v-if="providerMap?.[option]"
                :class="
                  ui?.providerBadge ??
                  'ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted'
                "
              >
                {{ PROVIDER_LABELS[providerMap[option]] ?? providerMap[option] }}
              </span>
            </slot>
          </ComboboxItem>

          <div v-if="filtered.length === 0 && searchTerm" :class="ui?.empty">
            {{ emptySearchText ?? 'No fonts found' }}
          </div>
          <div v-else-if="filtered.length === 0" :class="ui?.empty">
            <div>
              <p v-if="accessState === 'prompt'">
                Allow local font access to browse installed fonts.
              </p>
              <p v-else-if="accessState === 'denied'">
                Local font access is blocked for this site.
              </p>
              <p v-else-if="accessState === 'unsupported'">
                Local fonts are not available in this browser.
              </p>
              <p v-else>{{ emptyFontsText ?? 'No local fonts available.' }}</p>
              <p v-if="emptyFontsHint" class="mt-1">{{ emptyFontsHint }}</p>
              <button
                v-if="accessState === 'prompt'"
                type="button"
                :class="ui?.emptyAction"
                :disabled="loading"
                @click="requestAccess"
              >
                {{ loading ? 'Loading…' : 'Allow local fonts' }}
              </button>
            </div>
          </div>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
