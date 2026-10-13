<script setup lang="ts">
import type { VariableItem } from './utils'

const { variables, resolveImageHash } = defineProps<{
  variables: VariableItem[]
  resolveImageHash: (hash: string) => string
}>()

const emit = defineEmits<{
  upload: []
  replace: [id: string]
  remove: [id: string]
  rename: [id: string, name: string]
}>()
</script>

<template>
  <section
    class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-4"
  >
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30"
        >
          <icon-lucide-image class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Brand Logos & Identity Assets
            <span class="text-[10px] font-normal text-amber-400 font-mono"
              >{{ variables.length }} logos</span
            >
          </h2>
          <p class="text-[11px] text-zinc-400">
            Vector logos, logomarks, and identity graphic assets.
          </p>
        </div>
      </div>
      <button
        class="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
        @click="emit('upload')"
      >
        <icon-lucide-plus class="size-3.5 stroke-[3]" />
        <span>Add Logo</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="variables.length === 0"
      class="rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center flex flex-col items-center justify-center gap-2.5"
    >
      <div
        class="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
      >
        <icon-lucide-image class="size-5" />
      </div>
      <p class="text-xs font-semibold text-white">No brand logos uploaded yet</p>
      <p class="text-[11px] text-zinc-400 max-w-sm">
        Upload PNG or SVG logo files to reference them as variables in your designs.
      </p>
      <button
        class="mt-1 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
        @click="emit('upload')"
      >
        <icon-lucide-upload class="size-3.5" />
        <span>Upload First Logo</span>
      </button>
    </div>

    <!-- Logo Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      <div
        v-for="v in variables"
        :key="v.id"
        class="flex flex-col items-center relative group p-3 rounded-2xl bg-black/50 border border-white/10 shadow-sm hover:border-amber-500/40 transition-all"
      >
        <!-- Checkerboard wrapper for transparent logos -->
        <div
          class="relative flex items-center justify-center w-full aspect-video rounded-xl bg-checkerboard border border-white/10 overflow-hidden mb-2.5"
        >
          <img
            v-if="v.value"
            :src="resolveImageHash(String(v.value))"
            alt="Brand Logo"
            class="max-w-[85%] max-h-[85%] object-contain"
          />

          <!-- Replace overlay on hover -->
          <button
            class="absolute inset-0 bg-black/75 text-white text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer backdrop-blur-xs"
            @click="emit('replace', v.id)"
          >
            <icon-lucide-upload class="size-3.5" />
            <span>Replace</span>
          </button>
        </div>

        <!-- Logo Details (Name input + Delete) -->
        <div class="flex items-center gap-1.5 w-full">
          <input
            type="text"
            :value="v.name"
            placeholder="logo-name"
            class="flex-1 min-w-0 bg-transparent text-xs font-bold text-white border-none outline-none focus:text-amber-300 transition-colors p-0 text-center"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />

          <button
            class="opacity-0 group-hover:opacity-100 flex cursor-pointer items-center justify-center size-6 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
            title="Delete logo"
            @click="emit('remove', v.id)"
          >
            <icon-lucide-trash-2 class="size-3" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bg-checkerboard {
  background-color: rgba(255, 255, 255, 0.05);
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0;
}
</style>
