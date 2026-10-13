<script setup lang="ts">
import type { VariableItem } from './utils'

const { variables } = defineProps<{
  variables: VariableItem[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  rename: [id: string, name: string]
  updateValue: [id: string, val: number]
}>()
</script>

<template>
  <section
    class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-4"
  >
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30"
        >
          <icon-lucide-layout-grid class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            8pt Spacings & Layout Gaps
            <span class="text-[10px] font-normal text-rose-400 font-mono"
              >{{ variables.length }} sizes</span
            >
          </h2>
          <p class="text-[11px] text-zinc-400">
            Tokens for padding, auto-layout margins, and component gaps.
          </p>
        </div>
      </div>
      <button
        class="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3.5 stroke-[3]" />
        <span>Add Spacing</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="variables.length === 0"
      class="rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center flex flex-col items-center justify-center gap-2.5"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
        <icon-lucide-layout-grid class="size-5" />
      </div>
      <p class="text-xs font-semibold text-white">No spacing variables defined yet</p>
      <p class="text-[11px] text-zinc-400 max-w-sm">
        Establish 4px, 8px, 16px, 24px tokens or apply a starter preset.
      </p>
      <button
        class="mt-1 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3.5" />
        <span>Add First Spacing</span>
      </button>
    </div>

    <!-- Spacing List -->
    <div v-else class="flex flex-col gap-2.5">
      <div
        v-for="v in variables"
        :key="v.id"
        class="flex items-center gap-3 p-2.5 px-3 rounded-2xl bg-black/50 border border-white/10 shadow-sm relative group hover:border-rose-500/40 transition-all"
      >
        <!-- Spacing Graphical Box / Visual Indicator -->
        <div
          class="flex items-center justify-center size-8 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0"
        >
          <div
            class="rounded-sm bg-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            :style="{
              width: `${Math.max(4, Math.min(Number(v.value) / 2, 22))}px`,
              height: `${Math.max(4, Math.min(Number(v.value) / 2, 22))}px`
            }"
          />
        </div>

        <!-- Label name input -->
        <div class="flex-1 min-w-0">
          <input
            type="text"
            :value="v.name"
            placeholder="spacing-token-name"
            class="w-full bg-transparent text-xs font-bold text-white border-none outline-none focus:text-rose-300 transition-colors p-0"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Size value input & Delete -->
        <div class="flex items-center gap-2">
          <div
            class="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1"
          >
            <input
              type="number"
              :value="v.value"
              class="w-12 bg-transparent text-right text-xs font-mono font-bold text-white outline-none focus:text-rose-300"
              @change="emit('updateValue', v.id, Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-[10px] font-mono text-zinc-500 font-bold">px</span>
          </div>

          <button
            class="opacity-0 group-hover:opacity-100 flex cursor-pointer items-center justify-center size-7 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete spacing"
            @click="emit('remove', v.id)"
          >
            <icon-lucide-trash-2 class="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
