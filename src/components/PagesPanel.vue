<script setup lang="ts">
import { ref, watch } from 'vue'
import { templateRef } from '@vueuse/core'

import { PageListRoot, useI18n, useInlineRename } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'

import Tip from '@/components/ui/Tip.vue'

const editor = useEditorStore()
const pageInput = templateRef<HTMLInputElement>('pageInput')
const rename = useInlineRename((id, name) => pageActions.value?.rename(id, name))
const { panels } = useI18n()

const pageActions = ref<{
  rename: (pageId: string, name: string) => void
} | null>(null)

function setPageActions(renamePage: (pageId: string, name: string) => void) {
  pageActions.value = { rename: renamePage }
}

watch(pageInput, (input) => {
  if (input) void rename.focusInput(input)
})

function startRename(pg: { id: string; name: string }) {
  rename.start(pg.id, pg.name)
}

function handlePageDblClick(
  pg: { id: string; name: string },
  renamePage: (pageId: string, name: string) => void
) {
  setPageActions(renamePage)
  startRename(pg)
}

function onDuplicatePage(pageId: string) {
  editor.duplicatePage(pageId)
}
</script>

<template>
  <PageListRoot v-slot="{ pages, currentPageId, isDivider, actions }">
    <div data-test-id="pages-panel" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between px-3 py-1.5">
        <span data-test-id="pages-header" class="text-[11px] tracking-wider text-muted uppercase">{{
          panels.pages
        }}</span>
        <Tip :label="panels.addPage">
          <button
            data-test-id="pages-add"
            class="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
            @click="actions.add()"
          >
            +
          </button>
        </Tip>
      </div>
      <div class="scrollbar-thin overflow-x-hidden overflow-y-auto px-2 pb-1 space-y-1">
        <div v-for="pg in pages" :key="pg.id">
          <div
            v-if="rename.editingId.value === pg.id"
            class="flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 bg-white/10 border border-white/20"
          >
            <icon-lucide-file class="size-3.5 shrink-0 opacity-70" />
            <input
              ref="pageInput"
              data-test-id="pages-item-input"
              class="min-w-0 flex-1 rounded border border-rose-500 bg-black/50 px-1 py-0 text-xs text-white outline-none"
              :value="pg.name"
              @blur="rename.commit(pg.id, $event)"
              @keydown.stop="rename.onKeydown"
            />
          </div>
          <div
            v-else-if="isDivider(pg)"
            class="my-1.5 flex items-center px-2"
            @dblclick="startRename(pg)"
          >
            <div class="h-px flex-1 bg-white/10" />
          </div>
          <div v-else class="group relative flex w-full items-center">
            <button
              data-test-id="pages-item"
              class="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all duration-200"
              :class="
                pg.id === currentPageId
                  ? 'bg-rose-600 text-white font-bold shadow-[0_4px_14px_rgba(225,29,72,0.35)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              "
              @click="actions.switch(pg.id)"
              @dblclick="handlePageDblClick(pg, actions.rename)"
            >
              <icon-lucide-file-text class="size-3.5 shrink-0" :class="pg.id === currentPageId ? 'text-white' : 'text-zinc-500'" />
              <span class="truncate flex-1">{{ pg.name }}</span>
            </button>
            <Tip label="Duplicate Page">
              <button
                class="absolute right-2 hidden group-hover:flex size-5 items-center justify-center rounded text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                @click.stop="onDuplicatePage(pg.id)"
              >
                <icon-lucide-copy class="size-3" />
              </button>
            </Tip>
          </div>
        </div>
      </div>
    </div>
  </PageListRoot>
</template>
