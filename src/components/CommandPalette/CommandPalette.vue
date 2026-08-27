<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'

import { useI18n, useEditorCommands } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'
import { openFileDialog } from '@/app/shell/menu/use'
import { useAppTheme } from '@/app/shell/theme'
import type { Tool } from '@nex-design/core/editor'

export interface PaletteItem {
  id: string
  label: string
  category: 'Command' | 'Tool' | 'File' | 'View' | 'AI'
  shortcut?: string
  action: () => void
  disabled?: boolean
}

const open = defineModel<boolean>('open', { default: false })
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const store = useEditorStore()
const { commands } = useEditorCommands()
const { setTheme } = useAppTheme()
const { tools: toolLabels, menu: menuLabels } = useI18n()

const allItems = computed<PaletteItem[]>(() => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const mod = isMac ? '⌘' : 'Ctrl+'
  const alt = isMac ? '⌥' : 'Alt+'
  const shift = isMac ? '⇧' : 'Shift+'

  const items: PaletteItem[] = []

  // 1. Editor Commands
  if (commands) {
    for (const cmd of Object.values(commands)) {
      items.push({
        id: cmd.id,
        label: cmd.label,
        category: 'Command',
        action: () => {
          cmd.run()
          open.value = false
        },
        disabled: !cmd.enabled?.value
      })
    }
  }

  // 2. Tools
  const toolList: Array<{ id: Tool; label: string; shortcut: string }> = [
    { id: 'SELECT', label: toolLabels.move || 'Move / Select', shortcut: 'V' },
    { id: 'FRAME', label: toolLabels.frame || 'Frame', shortcut: 'F' },
    { id: 'SECTION', label: toolLabels.section || 'Section', shortcut: 'S' },
    { id: 'RECTANGLE', label: toolLabels.rectangle || 'Rectangle', shortcut: 'R' },
    { id: 'ELLIPSE', label: toolLabels.ellipse || 'Ellipse', shortcut: 'O' },
    { id: 'LINE', label: toolLabels.line || 'Line', shortcut: 'L' },
    { id: 'POLYGON', label: toolLabels.polygon || 'Polygon', shortcut: '' },
    { id: 'STAR', label: toolLabels.star || 'Star', shortcut: '' },
    { id: 'TEXT', label: toolLabels.text || 'Text', shortcut: 'T' },
    { id: 'PEN', label: toolLabels.pen || 'Pen', shortcut: 'P' },
    { id: 'HAND', label: toolLabels.hand || 'Hand', shortcut: 'H' }
  ]

  for (const t of toolList) {
    items.push({
      id: `tool.${t.id}`,
      label: `Tool: ${t.label}`,
      category: 'Tool',
      shortcut: t.shortcut,
      action: () => {
        store.setTool(t.id)
        open.value = false
      }
    })
  }

  // 3. File & Export Actions
  items.push(
    {
      id: 'file.new',
      label: 'New Document / Tab',
      category: 'File',
      shortcut: `${mod}N`,
      action: () => {
        void import('@/app/tabs').then((m) => m.createTab())
        open.value = false
      }
    },
    {
      id: 'file.open',
      label: 'Open .fig File…',
      category: 'File',
      shortcut: `${mod}O`,
      action: () => {
        void openFileDialog()
        open.value = false
      }
    },
    {
      id: 'file.save',
      label: 'Save Document',
      category: 'File',
      shortcut: `${mod}S`,
      action: () => {
        void store.saveFigFile()
        open.value = false
      }
    },
    {
      id: 'file.save-as',
      label: 'Save Document As…',
      category: 'File',
      shortcut: `${mod}${shift}S`,
      action: () => {
        void store.saveFigFileAs()
        open.value = false
      }
    },
    {
      id: 'export.png',
      label: 'Export Selection as PNG',
      category: 'File',
      shortcut: `${mod}${shift}E`,
      action: () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
        open.value = false
      },
      disabled: store.state.selectedIds.size === 0
    },
    {
      id: 'export.svg',
      label: 'Export Selection as SVG',
      category: 'File',
      action: () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'svg')
        open.value = false
      },
      disabled: store.state.selectedIds.size === 0
    },
    {
      id: 'export.fig',
      label: 'Export Selection as .fig',
      category: 'File',
      action: () => {
        if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'fig')
        open.value = false
      },
      disabled: store.state.selectedIds.size === 0
    }
  )

  // 4. View & Mode Actions
  items.push(
    {
      id: 'view.outline-mode',
      label: 'Toggle Outline Mode',
      category: 'View',
      shortcut: `${shift}O`,
      action: () => {
        store.toggleOutlineMode()
        open.value = false
      }
    },
    {
      id: 'view.toggle-ui',
      label: 'Toggle UI Panels',
      category: 'View',
      shortcut: `${mod}\\`,
      action: () => {
        store.state.showUI = !store.state.showUI
        open.value = false
      }
    },
    {
      id: 'theme.dark',
      label: 'Theme: Dark',
      category: 'View',
      action: () => {
        setTheme('dark')
        open.value = false
      }
    },
    {
      id: 'theme.light',
      label: 'Theme: Light',
      category: 'View',
      action: () => {
        setTheme('light')
        open.value = false
      }
    },
    {
      id: 'theme.auto',
      label: 'Theme: System',
      category: 'View',
      action: () => {
        setTheme('auto')
        open.value = false
      }
    }
  )

  // 5. AI Assistant & Creative Notes
  items.push(
    {
      id: 'ai.chat',
      label: 'AI Design Assistant (Chat)',
      category: 'AI',
      shortcut: `${mod}J`,
      action: () => {
        store.state.activePanel = store.state.activePanel === 'ai' ? null : 'ai'
        open.value = false
      }
    },
    {
      id: 'view.creative-notes',
      label: 'Creative Notes',
      category: 'View',
      shortcut: `${mod}${alt}N`,
      action: () => {
        store.state.showCreativeNotes = !store.state.showCreativeNotes
        open.value = false
      }
    }
  )

  return items
})

const filteredItems = computed<PaletteItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allItems.value
  return allItems.value.filter((item) => {
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.shortcut && item.shortcut.toLowerCase().includes(q))
    )
  })
})

watch(open, (isOpen) => {
  if (isOpen) {
    query.value = ''
    selectedIndex.value = 0
    void nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

watch(filteredItems, () => {
  if (selectedIndex.value >= filteredItems.value.length) {
    selectedIndex.value = Math.max(0, filteredItems.value.length - 1)
  }
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[selectedIndex.value]
    if (item && !item.disabled) {
      item.action()
    }
  }
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
      <DialogContent
        class="fixed top-[20%] left-1/2 z-50 flex w-[560px] max-w-[90vw] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl outline-none"
        @keydown="onKeyDown"
      >
        <DialogTitle class="sr-only">Quick Actions</DialogTitle>

        <!-- Search Input Header -->
        <div class="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <icon-lucide-search class="size-4 shrink-0 text-muted" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Type a command or search actions…"
            class="w-full bg-transparent text-[13px] text-surface placeholder:text-muted outline-none"
          />
          <kbd class="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>

        <!-- Filtered Items List -->
        <div class="max-h-[360px] overflow-y-auto p-1.5">
          <div v-if="filteredItems.length === 0" class="py-8 text-center text-xs text-muted">
            No matching actions found
          </div>
          <div
            v-for="(item, index) in filteredItems"
            :key="item.id"
            :class="[
              'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors',
              index === selectedIndex ? 'bg-accent text-white' : 'text-surface hover:bg-hover',
              item.disabled ? 'cursor-not-allowed opacity-40' : ''
            ]"
            @click="!item.disabled && item.action()"
            @mouseenter="selectedIndex = index"
          >
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                  index === selectedIndex
                    ? 'bg-white/20 text-white'
                    : 'bg-muted/20 text-muted'
                ]"
              >
                {{ item.category }}
              </span>
              <span class="font-medium">{{ item.label }}</span>
            </div>

            <kbd
              v-if="item.shortcut"
              :class="[
                'rounded px-1.5 py-0.5 text-[10px]',
                index === selectedIndex ? 'bg-white/20 text-white' : 'border border-border text-muted'
              ]"
            >
              {{ item.shortcut }}
            </kbd>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
