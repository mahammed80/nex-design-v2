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
  <section
    class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-5"
  >
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30"
        >
          <icon-lucide-type class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Typography & Fonts
            <span class="text-[10px] font-normal text-rose-400 font-mono"
              >{{ fontVariables.length }} families</span
            >
          </h2>
          <p class="text-[11px] text-zinc-400">
            Font families, weights, and modular type scale sizes.
          </p>
        </div>
      </div>
      <button
        class="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95"
        @click="emit('addFont')"
      >
        <icon-lucide-plus class="size-3.5 stroke-[3]" />
        <span>Add Font</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="fontVariables.length === 0"
      class="rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center flex flex-col items-center justify-center gap-2.5"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
        <icon-lucide-type class="size-5" />
      </div>
      <p class="text-xs font-semibold text-white">No font families defined yet</p>
      <p class="text-[11px] text-zinc-400 max-w-sm">
        Pick primary & secondary Google Fonts or load a starter preset.
      </p>
      <button
        class="mt-1 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
        @click="emit('addFont')"
      >
        <icon-lucide-plus class="size-3.5" />
        <span>Add First Font</span>
      </button>
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- Font Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          v-for="v in fontVariables"
          :key="v.id"
          class="flex flex-col items-center relative group p-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-sm hover:border-rose-500/50 hover:shadow-lg transition-all"
        >
          <!-- Aa Box preview -->
          <div
            class="w-full aspect-video rounded-xl bg-black/60 border border-white/10 flex items-center justify-center flex-col gap-1 mb-3"
            :style="{ fontFamily: `'${v.value}', sans-serif` }"
          >
            <span class="text-4xl font-bold text-white tracking-tight">Aa</span>
            <span class="text-[10px] text-zinc-400 font-mono">{{ v.value }}</span>
          </div>

          <!-- Font Details (Variable name, Picker, Delete) -->
          <div class="flex flex-col gap-2 w-full">
            <div class="flex items-center justify-between gap-2">
              <input
                type="text"
                :value="v.name"
                placeholder="font-token-name"
                class="flex-1 min-w-0 bg-transparent text-xs font-bold text-white border-none outline-none focus:text-rose-300 transition-colors p-0"
                @change="emit('renameFont', v.id, ($event.target as HTMLInputElement).value)"
              />
              <button
                class="opacity-0 group-hover:opacity-100 flex cursor-pointer items-center justify-center size-6 rounded-lg bg-black/70 border border-white/20 text-white hover:bg-red-500 hover:border-red-500 shadow-sm transition-all"
                title="Delete font variable"
                @click="emit('removeFont', v.id)"
              >
                <icon-lucide-trash-2 class="size-3" />
              </button>
            </div>

            <FontPicker
              class="w-full bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              :model-value="String(v.value)"
              @select="emit('updateValue', v.id, $event)"
            />
          </div>
        </div>
      </div>

      <!-- Typography Scale Font Sizes -->
      <div class="flex flex-col gap-2.5">
        <h3 class="text-xs font-bold tracking-tight text-zinc-300 flex items-center gap-1.5">
          <icon-lucide-ruler class="size-3.5 text-rose-400" />
          <span>Type Scale Ladder (px)</span>
        </h3>
        <div
          class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-sm"
        >
          <div
            v-for="v in fontSizeVariables"
            :key="v.id"
            class="flex flex-col gap-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:border-rose-400/40 transition-all"
          >
            <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">
              {{ getFontSizeLabel(v.name) }}
            </span>
            <div class="flex items-center gap-1.5">
              <input
                type="number"
                :value="v.value"
                class="w-full bg-transparent text-xs font-mono font-bold text-white border-none outline-none p-0 focus:text-rose-300"
                @change="
                  emit('updateValue', v.id, Number(($event.target as HTMLInputElement).value))
                "
              />
              <span class="text-[9px] text-zinc-500 font-mono font-bold">px</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Typography Scale Preview -->
      <div class="flex flex-col gap-2.5">
        <h3 class="text-xs font-bold tracking-tight text-zinc-300 flex items-center gap-1.5">
          <icon-lucide-eye class="size-3.5 text-rose-400" />
          <span>Live Hierarchy Specimen</span>
        </h3>
        <div
          class="flex flex-col gap-4 p-5 rounded-2xl bg-black/60 border border-white/10 shadow-sm leading-none"
          :style="{ fontFamily: `'${previewFontFamily}', sans-serif` }"
        >
          <div class="flex flex-col border-b border-white/10 pb-3">
            <span class="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1"
              >Display 1 ({{ getFontSizeVal('font-size-display') }}px)</span
            >
            <h1
              :style="{ fontSize: `${getFontSizeVal('font-size-display')}px` }"
              class="font-bold leading-none tracking-tight text-white"
            >
              Display Hero
            </h1>
          </div>

          <div class="flex flex-col border-b border-white/10 pb-3">
            <span class="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1"
              >Heading 1 ({{ getFontSizeVal('font-size-h1') }}px)</span
            >
            <h2
              :style="{ fontSize: `${getFontSizeVal('font-size-h1')}px` }"
              class="font-bold leading-tight text-white"
            >
              Main Headline
            </h2>
          </div>

          <div class="flex flex-col border-b border-white/10 pb-3">
            <span class="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1"
              >Heading 2 ({{ getFontSizeVal('font-size-h2') }}px)</span
            >
            <h3
              :style="{ fontSize: `${getFontSizeVal('font-size-h2')}px` }"
              class="font-bold leading-snug text-white"
            >
              Section Title
            </h3>
          </div>

          <div class="flex flex-col border-b border-white/10 pb-3">
            <span class="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1"
              >Paragraph ({{ getFontSizeVal('font-size-body') }}px)</span
            >
            <p
              :style="{ fontSize: `${getFontSizeVal('font-size-body')}px` }"
              class="font-normal text-zinc-300 leading-relaxed"
            >
              NexDesign gives creators instant design variables, scalable UI components, and
              real-time collaboration.
            </p>
          </div>

          <div class="flex flex-col">
            <span class="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-2"
              >Interactive Button ({{ getFontSizeVal('font-size-small') }}px)</span
            >
            <div class="flex items-center gap-3">
              <button
                :style="{ fontSize: `${getFontSizeVal('font-size-small')}px` }"
                class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-rose-600/20 transition-colors cursor-default"
              >
                Primary Action
              </button>
              <a
                href="#"
                :style="{ fontSize: `${getFontSizeVal('font-size-small')}px` }"
                class="text-rose-400 hover:underline font-semibold"
                @click.prevent
              >
                Secondary Text Link →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
