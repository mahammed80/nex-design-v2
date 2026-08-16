<script setup lang="ts">
import { watch, type Component } from 'vue'
import { templateRef } from '@vueuse/core'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger
} from 'reka-ui'
import { FlexRender } from '@tanstack/vue-table'

import { useI18n, useVariablesEditor } from '@nex-design/vue'

import IconHash from '~icons/lucide/hash'
import IconPalette from '~icons/lucide/palette'
import IconToggleLeft from '~icons/lucide/toggle-left'
import IconType from '~icons/lucide/type'
import IconX from '~icons/lucide/x'
import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import Tip from './ui/Tip.vue'
import { useDialogUI } from '@/components/ui/dialog'
import { useMenuUI } from '@/components/ui/menu'

import type { VariableType } from '@nex-design/core/scene-graph'

const open = defineModel<boolean>('open', { default: false })
const cls = useDialogUI({ content: 'flex h-[85vh] w-[1100px] max-w-[95vw] flex-col overflow-hidden bg-panel' })
const menuCls = useMenuUI({ content: 'w-40' })

const variableTypeIcons: Record<VariableType, Component> = {
  COLOR: IconPalette,
  FLOAT: IconHash,
  STRING: IconType,
  BOOLEAN: IconToggleLeft
}

const { dialogs, panels, variableTypes: variableTypeText } = useI18n()

const variableTypes: Array<{
  type: VariableType
  label: () => string
  description: () => string
}> = [
  {
    type: 'COLOR',
    label: () => variableTypeText.value.color,
    description: () => variableTypeText.value.colorHint
  },
  {
    type: 'FLOAT',
    label: () => variableTypeText.value.number,
    description: () => variableTypeText.value.numberHint
  },
  {
    type: 'STRING',
    label: () => variableTypeText.value.text,
    description: () => variableTypeText.value.textHint
  },
  {
    type: 'BOOLEAN',
    label: () => variableTypeText.value.boolean,
    description: () => variableTypeText.value.booleanHint
  }
]

const ctx = useVariablesEditor({
  colorInput: ColorInput,
  icons: variableTypeIcons,
  fallbackIcon: IconToggleLeft,
  deleteIcon: IconX
})
const collectionInput = templateRef<HTMLInputElement>('collectionInput')
const modeInput = templateRef<HTMLInputElement>('modeInput')

watch(collectionInput, (input) => {
  void ctx.collectionRename.focusInput(input)
})
watch(modeInput, (input) => {
  void ctx.modeRename.focusInput(input)
})

function getModeId(columnId: string): string | undefined {
  return columnId.startsWith('mode-') ? columnId.slice(5) : undefined
}

function modeId(columnId: string): string {
  return columnId.slice(5)
}

function getGroupPath(name: string): string {
  const parts = name.split('/')
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join(' / ')
}

function shouldShowGroupHeader(row: { original: { name: string } }, rowIndex: number): boolean {
  const currentPath = getGroupPath(row.original.name)
  if (!currentPath) return false
  if (rowIndex === 0) return true
  const prevRow = ctx.table.getRowModel().rows[rowIndex - 1]
  const prevPath = getGroupPath(prevRow.original.name)
  return currentPath !== prevPath
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay :class="cls.overlay" />
      <DialogContent data-test-id="variables-dialog" :class="cls.content">
        <!-- Empty State: No collections -->
        <div v-if="!ctx.hasCollections" class="flex flex-1 flex-col">
          <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle class="text-sm font-semibold text-surface">{{
              dialogs.localVariables
            }}</DialogTitle>
            <DialogClose
              class="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
            >
              <icon-lucide-x class="size-4" />
            </DialogClose>
          </div>
          <div class="flex flex-1 items-center justify-center">
            <div class="text-center">
              <p class="text-sm text-muted">{{ dialogs.noVariableCollections }}</p>
              <button
                data-test-id="variables-create-collection"
                class="mt-2 cursor-pointer rounded bg-hover px-3 py-1.5 text-xs text-surface hover:bg-border"
                @click="ctx.addCollection"
              >
                {{ dialogs.createCollection }}
              </button>
            </div>
          </div>
        </div>

        <!-- Collections UI -->
        <template v-else>
          <TabsRoot
            v-model="ctx.activeCollectionId.value"
            class="flex flex-1 flex-row overflow-hidden"
          >
            <!-- Left Sidebar for Collections -->
            <div class="flex w-52 shrink-0 flex-col border-r border-border bg-panel/30">
              <div class="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 py-2">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Collections</span>
                <Tip :label="dialogs.createCollection">
                  <button
                    data-test-id="variables-add-collection"
                    class="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                    @click="ctx.addCollection"
                  >
                    <icon-lucide-folder-plus class="size-3.5" />
                  </button>
                </Tip>
              </div>
              <TabsList class="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
                <template v-for="col in ctx.collections.value" :key="col.id">
                  <TabsTrigger
                    :value="col.id"
                    data-test-id="variables-collection-tab"
                    class="group/col relative flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-muted border-none bg-transparent text-left cursor-pointer data-[state=active]:bg-hover data-[state=active]:text-surface hover:bg-hover hover:text-surface"
                  >
                    <input
                      v-if="ctx.collectionRename.editingId.value === col.id"
                      ref="collectionInput"
                      class="w-full rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
                      :value="col.name"
                      @blur="ctx.collectionRename.commit(col.id, $event)"
                      @keydown="ctx.collectionRename.onKeydown"
                      @click.stop
                    />
                    <span v-else class="flex-1 truncate" @dblclick.stop="ctx.startRenameCollection(col.id)">{{ col.name }}</span>
                    
                    <DropdownMenuRoot v-if="ctx.collectionRename.editingId.value !== col.id">
                      <DropdownMenuTrigger as-child>
                        <button
                          data-test-id="variables-collection-menu"
                          class="opacity-0 group-hover/col:opacity-100 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-border hover:text-surface"
                          @click.stop
                        >
                          <icon-lucide-ellipsis class="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          side="bottom"
                          :side-offset="4"
                          align="start"
                          :class="menuCls.content"
                        >
                          <DropdownMenuItem
                            :class="menuCls.item"
                            @select="ctx.startRenameCollection(col.id)"
                          >
                            <icon-lucide-pencil :class="menuCls.icon" />
                            {{ dialogs.renameCollection }}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator class="mx-1.5 my-1 h-px bg-border" />
                          <DropdownMenuItem
                            :class="menuCls.item"
                            class="text-red-500"
                            data-test-id="variables-delete-collection"
                            @select="ctx.removeCollection(col.id)"
                          >
                            <icon-lucide-trash-2 :class="menuCls.icon" />
                            {{ dialogs.deleteCollection }}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenuRoot>
                  </TabsTrigger>
                </template>
              </TabsList>
            </div>

            <!-- Right Content Area -->
            <div class="flex flex-1 flex-col overflow-hidden bg-panel/10">
              <!-- Top bar for search & close -->
              <div class="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 py-2">
                <div class="flex items-center gap-1.5 rounded border border-border px-2 py-0.5 bg-input/30">
                  <icon-lucide-search class="size-3 text-muted" />
                  <input
                    v-model="ctx.searchTerm.value"
                    data-test-id="variables-search-input"
                    class="w-40 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
                    :placeholder="dialogs.search"
                  />
                </div>
                <DialogClose
                  class="flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                >
                  <icon-lucide-x class="size-4" />
                </DialogClose>
              </div>

              <!-- Main Content: TabsContent for active collection -->
              <TabsContent
                v-for="col in ctx.collections.value"
                :key="col.id"
                :value="col.id"
                class="flex flex-1 flex-col overflow-hidden outline-none"
              >
                <!-- Empty State (No Variables or No Search Results) -->
                <div v-if="ctx.variables.value.length === 0" class="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <template v-if="ctx.searchTerm.value">
                    <icon-lucide-search class="size-8 text-muted mb-2 opacity-50" />
                    <p class="text-sm text-surface font-medium">No results found</p>
                    <p class="text-xs text-muted mt-1">No variables matching "{{ ctx.searchTerm.value }}"</p>
                  </template>
                  <template v-else>
                    <icon-lucide-database class="size-8 text-muted mb-2 opacity-50" />
                    <p class="text-sm text-surface font-medium">No variables in this collection</p>
                    <p class="text-xs text-muted max-w-[240px] mt-1">Create a variable to store reusable colors, numbers, text, or booleans.</p>
                    
                    <div class="mt-4 flex gap-1.5 justify-center flex-wrap max-w-xs">
                      <button
                        v-for="item in variableTypes"
                        :key="item.type"
                        class="flex items-center gap-1 cursor-pointer rounded bg-hover hover:bg-border px-2.5 py-1 text-xs text-surface border-none"
                        @click="ctx.addVariable(item.type)"
                      >
                        <component :is="variableTypeIcons[item.type]" class="size-3" />
                        <span>{{ item.label() }}</span>
                      </button>
                    </div>
                  </template>
                </div>

                <!-- Table Area -->
                <template v-else>
                  <div class="flex-1 overflow-auto">
                    <table
                      class="w-full border-collapse"
                      :style="{ width: `${ctx.table.getCenterTotalSize()}px` }"
                    >
                      <thead class="sticky top-0 z-10 bg-panel border-b border-border">
                        <tr
                          v-for="headerGroup in ctx.table.getHeaderGroups()"
                          :key="headerGroup.id"
                        >
                          <th
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            class="relative px-4 py-2 text-left text-[11px] font-medium text-muted"
                            :style="{ width: `${header.getSize()}px` }"
                          >
                            <template v-if="getModeId(header.column.id)">
                              <input
                                v-if="ctx.modeRename.editingId.value === getModeId(header.column.id)"
                                ref="modeInput"
                                class="-mx-1 w-full rounded border border-accent bg-input px-1 py-0 text-[11px] font-medium text-surface outline-none"
                                :value="header.column.columnDef.header"
                                @blur="ctx.modeRename.commit(modeId(header.column.id), $event)"
                                @keydown="ctx.modeRename.onKeydown"
                              />
                              <ContextMenuRoot v-else>
                                <ContextMenuTrigger as-child>
                                  <span
                                    class="cursor-default"
                                    :class="
                                      getModeId(header.column.id) === col.defaultModeId
                                        ? 'text-surface font-semibold border-b border-dashed border-muted/50 pb-0.5'
                                        : ''
                                    "
                                    @dblclick="ctx.startRenameMode(modeId(header.column.id))"
                                  >
                                    {{ header.column.columnDef.header }}
                                  </span>
                                </ContextMenuTrigger>
                                <ContextMenuPortal>
                                  <ContextMenuContent :class="menuCls.content">
                                    <ContextMenuItem
                                      :class="menuCls.item"
                                      @select="ctx.startRenameMode(modeId(header.column.id))"
                                    >
                                      <icon-lucide-pencil :class="menuCls.icon" />
                                      {{ dialogs.renameMode }}
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      :class="menuCls.item"
                                      @select="ctx.duplicateMode(modeId(header.column.id))"
                                    >
                                      <icon-lucide-copy :class="menuCls.icon" />
                                      {{ dialogs.duplicateMode }}
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      v-if="getModeId(header.column.id) !== col.defaultModeId"
                                      :class="menuCls.item"
                                      @select="ctx.setDefaultMode(modeId(header.column.id))"
                                    >
                                      <icon-lucide-pin :class="menuCls.icon" />
                                      {{ dialogs.setDefaultMode }}
                                    </ContextMenuItem>
                                    <ContextMenuSeparator :class="menuCls.separator" />
                                    <ContextMenuItem
                                      :class="[menuCls.item, 'text-red-500']"
                                      :disabled="col.modes.length <= 1"
                                      @select="ctx.removeMode(modeId(header.column.id))"
                                    >
                                      <icon-lucide-trash-2 :class="menuCls.icon" />
                                      {{ dialogs.deleteMode }}
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenuPortal>
                              </ContextMenuRoot>
                            </template>
                            <FlexRender
                              v-else-if="!header.isPlaceholder"
                              :render="header.column.columnDef.header"
                              :props="header.getContext()"
                            />
                            <div
                              v-if="header.column.getCanResize()"
                              class="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none"
                              :class="
                                header.column.getIsResizing()
                                  ? 'bg-accent'
                                  : 'bg-transparent hover:bg-border'
                              "
                              @mousedown="header.getResizeHandler()?.($event)"
                              @touchstart="header.getResizeHandler()?.($event)"
                              @dblclick="header.column.resetSize()"
                            />
                          </th>
                          <th class="w-8 px-1 py-2">
                            <Tip :label="dialogs.addMode">
                              <button
                                data-test-id="variables-add-mode"
                                class="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                                @click="ctx.addMode"
                              >
                                <icon-lucide-plus class="size-3" />
                              </button>
                            </Tip>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <template v-for="(row, rowIndex) in ctx.table.getRowModel().rows" :key="row.id">
                          <!-- Slash Path Group Row Header -->
                          <tr v-if="shouldShowGroupHeader(row, rowIndex)" class="bg-hover/20 select-none">
                            <td :colspan="row.getVisibleCells().length + 1" class="px-4 py-1.5 text-[10px] font-semibold text-muted/80 uppercase tracking-wider border-b border-border/10">
                              <div class="flex items-center gap-1.5">
                                <icon-lucide-folder class="size-3 text-muted/65" />
                                <span>{{ getGroupPath(row.original.name) }}</span>
                              </div>
                            </td>
                          </tr>
                          <!-- Variable Row -->
                          <tr
                            data-test-id="variable-row"
                            class="group border-b border-border/30 hover:bg-hover/50"
                          >
                            <td
                              v-for="cell in row.getVisibleCells()"
                              :key="cell.id"
                              class="px-4 py-1.5"
                              :style="{ width: `${cell.column.getSize()}px` }"
                            >
                              <FlexRender
                                :render="cell.column.columnDef.cell"
                                :props="cell.getContext()"
                              />
                            </td>
                            <td class="w-8"></td>
                          </tr>
                        </template>
                      </tbody>
                    </table>
                  </div>

                  <!-- Footer Actions (Variable creation picker at bottom) -->
                  <div
                    class="flex w-full shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2 bg-panel"
                  >
                    <span class="text-xs text-muted">{{ panels.createVariable }}</span>
                    <DropdownMenuRoot>
                      <DropdownMenuTrigger as-child>
                        <button
                          data-test-id="variables-add-variable"
                          class="flex cursor-pointer items-center gap-1.5 rounded bg-hover px-2.5 py-1.5 text-xs text-surface hover:bg-border border-none"
                        >
                          <icon-lucide-plus class="size-3.5" />
                          {{ panels.add }}
                          <icon-lucide-chevron-down class="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          side="top"
                          :side-offset="8"
                          align="end"
                          :class="menuCls.content"
                        >
                          <DropdownMenuItem
                            v-for="item in variableTypes"
                            :key="item.type"
                            :class="menuCls.item"
                            :data-test-id="`variables-add-${item.type.toLowerCase()}`"
                            @select="ctx.addVariable(item.type)"
                          >
                            <component :is="variableTypeIcons[item.type]" :class="menuCls.icon" />
                            <span class="flex min-w-0 flex-1 flex-col">
                              <span>{{ item.label() }}</span>
                              <span class="truncate text-[10px] text-muted">{{
                                item.description()
                              }}</span>
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenuRoot>
                  </div>
                </template>
              </TabsContent>
            </div>
          </TabsRoot>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
