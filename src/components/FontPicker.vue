<script setup lang="ts">
import { ref } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverPortal } from 'reka-ui'
import { useSelectUI } from '@/components/ui/select'
import FontsPanel from './FontsPanel.vue'

const modelValue = defineModel<string>({ required: true })
const emit = defineEmits<{ (e: 'select', family: string): void }>()

const selectCls = useSelectUI({
  trigger: 'w-full rounded px-2 py-1 text-xs'
})

const open = ref(false)

function handleSelect(family: string) {
  open.value = false
  emit('select', family)
}
</script>

<template>
  <PopoverRoot v-model:open="open" :modal="false">
    <PopoverTrigger as-child>
      <button data-test-id="font-picker-trigger" :class="selectCls.trigger" type="button">
        <span class="truncate">{{ modelValue }}</span>
        <icon-lucide-chevron-down class="size-3 shrink-0 text-muted" />
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        side="left"
        :side-offset="16"
        align="start"
        @interact-outside="(e) => e.preventDefault()"
        class="z-[100] w-[280px] h-[400px] rounded-xl border border-border bg-panel p-0 shadow-2xl overflow-hidden flex flex-col"
      >
        <FontsPanel @select="handleSelect" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
