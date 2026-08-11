<script setup lang="ts">
import type { VariableValue } from '@nex-design/core/scene-graph'
import FontPicker from '@/components/FontPicker.vue'
import type { VariableItem } from './utils'

const { fontVariables, fontSizeVariables, previewFontFamily, getFontSizeVal, getFontSizeLabel } =
  defineProps<{
    fontVariables: VariableItem[]
    fontSizeVariables: VariableItem[]
    previewFontFamily: string
    getFontSizeVal: (name: string) => number
    getFontSizeLabel: (name: string) => string
  }>()

const emit = defineEmits<{
  addFont: []
  removeFont: [id: string]
  renameFont: [id: string, name: string]
  updateValue: [id: string, val: VariableValue]
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2
        class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
      >
        <icon-lucide-type class="size-4 text-accent" />
        Typography & Fonts
      </h2>
      <button
        class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
        @click="emit('addFont')"
      >
        <icon-lucide-plus class="size-3" />
        Add Font
      </button>
    </div>

    <div
      v-if="fontVariables.length === 0"
      class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
    >
      No font families defined. Click "+ Add Font" to begin.
    </div>

    <div v-else class="flex flex-col gap-6 mt-2">
      <!-- Font Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="v in fontVariables"
          :key="v.id"
          class="card-bubble flex flex-col items-center relative group/font p-4 rounded-lg bg-panel border border-border shadow-sm"
        >
          <!-- Aa Box preview -->
          <div
            class="w-full aspect-video rounded bg-input border border-border flex items-center justify-center flex-col gap-1 mb-3"
            :style="{ fontFamily: `'${v.valuesByMode.default}', sans-serif` }"
          >
            <span class="text-4xl font-semibold text-surface">Aa</span>
            <span class="text-[10px] text-muted">{{ v.valuesByMode.default }}</span>
          </div>

          <!-- Font Details (Variable name, Picker, Delete) -->
          <div class="flex flex-col gap-2 w-full">
            <div class="flex items-center justify-between gap-2">
              <input
                type="text"
                :value="v.name"
                placeholder="font-name"
                class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
                @change="emit('renameFont', v.id, ($event.target as HTMLInputElement).value)"
              />
              <button
                class="cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none shrink-0"
                title="Delete font variable"
                @click="emit('removeFont', v.id)"
              >
                <icon-lucide-trash-2 class="size-3.5" />
              </button>
            </div>

            <FontPicker
              class="w-full bg-input"
              :model-value="String(v.valuesByMode.default)"
              @select="emit('updateValue', v.id, $event)"
            />
          </div>
        </div>
      </div>

      <!-- Typography Scale Font Sizes -->
      <div class="flex flex-col gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted/80">
          Typography Scale Font Sizes (px)
        </h3>
        <div
          class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-panel border border-border/80 shadow-sm"
        >
          <div
            v-for="v in fontSizeVariables"
            :key="v.id"
            class="flex flex-col gap-1.5 p-2 rounded bg-input border border-border/40 hover:border-accent/30 transition-all"
          >
            <span class="text-[9px] text-muted font-bold tracking-wide truncate">{{
              getFontSizeLabel(v.name)
            }}</span>
            <div class="flex items-center gap-1.5">
              <input
                type="number"
                :value="v.valuesByMode.default"
                class="w-full bg-transparent text-xs font-mono text-surface border-none outline-none p-0 focus:ring-0"
                @change="
                  emit('updateValue', v.id, Number(($event.target as HTMLInputElement).value))
                "
              />
              <span class="text-[8px] text-muted font-bold">PX</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Typography Scale Preview -->
      <div class="flex flex-col gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted/80">
          Typography Scale Preview
        </h3>
        <div
          class="flex flex-col gap-6 p-6 rounded-lg bg-panel border border-border shadow-sm"
          :style="{ fontFamily: `'${previewFontFamily}', sans-serif` }"
        >
          <div class="flex flex-col border-b border-border/40 pb-4">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Display 1 ({{ getFontSizeVal('font-size-display-1') }}px, Bold)</span
            >
            <h1
              :style="{ fontSize: getFontSizeVal('font-size-display-1') + 'px' }"
              class="font-bold leading-none tracking-tight text-surface"
            >
              Display 1
            </h1>
          </div>

          <div class="flex flex-col border-b border-border/40 pb-4">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Heading 1 ({{ getFontSizeVal('font-size-heading-1') }}px, Bold)</span
            >
            <h2
              :style="{ fontSize: getFontSizeVal('font-size-heading-1') + 'px' }"
              class="font-bold leading-tight text-surface"
            >
              Heading 1
            </h2>
          </div>

          <div class="flex flex-col border-b border-border/40 pb-4">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Heading 2 ({{ getFontSizeVal('font-size-heading-2') }}px, Bold)</span
            >
            <h3
              :style="{ fontSize: getFontSizeVal('font-size-heading-2') + 'px' }"
              class="font-bold leading-snug text-surface"
            >
              Heading 2
            </h3>
          </div>

          <div class="flex flex-col border-b border-border/40 pb-4">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Heading 3 ({{ getFontSizeVal('font-size-heading-3') }}px, Bold)</span
            >
            <h4
              :style="{ fontSize: getFontSizeVal('font-size-heading-3') + 'px' }"
              class="font-bold leading-normal text-surface"
            >
              Heading 3
            </h4>
          </div>

          <div class="flex flex-col border-b border-border/40 pb-4">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Paragraph ({{ getFontSizeVal('font-size-body') }}px, Regular)</span
            >
            <p
              :style="{ fontSize: getFontSizeVal('font-size-body') + 'px' }"
              class="font-normal text-muted leading-relaxed"
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div class="flex flex-col">
            <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
              >Button / Link ({{ getFontSizeVal('font-size-button') }}px, Semibold)</span
            >
            <div class="flex items-center gap-4 mt-2">
              <button
                :style="{ fontSize: getFontSizeVal('font-size-button') + 'px' }"
                class="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded shadow transition-colors cursor-default"
              >
                Button
              </button>
              <a
                href="#"
                :style="{ fontSize: getFontSizeVal('font-size-button') + 'px' }"
                class="text-accent hover:underline font-semibold"
                @click.prevent
                >Hyperlink</a
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-bubble {
  background: var(--color-bg-panel, #ffffff);
}
</style>
