<script setup lang="ts">
import { ref } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverPortal } from 'reka-ui'
import { fetchIcon, searchIcons } from '@nex-design/core/icons'
import { parseColor } from '@nex-design/core/color'

import Tip from '@/components/ui/Tip.vue'
import ToolButton from '@/components/Toolbar/ToolButton.vue'
import ToolFlyout from '@/components/Toolbar/ToolFlyout.vue'
import { ToolbarItem } from '@nex-design/vue'

import type { Tool } from '@nex-design/vue'
import type { EditorToolDef, Editor } from '@nex-design/core/editor'
import type { StrokeCap, StrokeJoin } from '@nex-design/core/scene-graph'
import type { ToolbarUi, ToolIconMap, ToolLabels } from '@/components/Toolbar/types'

const { editor, tools, activeTool, toolIcons, toolLabels, toolShortcuts, ui } = defineProps<{
  editor: Editor
  tools: EditorToolDef[]
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUi
}>()

const emit = defineEmits<{
  setTool: [tool: Tool]
}>()

function isActive(tool: EditorToolDef) {
  return tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false)
}

function activeKeyForTool(tool: EditorToolDef) {
  return tool.flyout?.includes(activeTool) ? activeTool : tool.key
}

// Icon Picker state
const searchQuery = ref('')
const loadingIcons = ref(false)

const POPULAR_ICONS = [
  'lucide:home',
  'lucide:settings',
  'lucide:user',
  'lucide:heart',
  'lucide:search',
  'lucide:star',
  'lucide:check',
  'lucide:x',
  'lucide:menu',
  'lucide:chevron-down',
  'lucide:chevron-right',
  'lucide:plus',
  'lucide:minus',
  'lucide:trash',
  'lucide:edit',
  'lucide:share',
  'lucide:download',
  'lucide:upload',
  'lucide:alert-triangle',
  'lucide:info',
  'lucide:help-circle',
  'lucide:bell',
  'lucide:mail',
  'lucide:lock',
  'lucide:unlock',
  'lucide:camera',
  'lucide:image',
  'lucide:file-text',
  'lucide:folder',
  'lucide:map-pin',
  'lucide:calendar',
  'lucide:clock'
]
const iconResults = ref<string[]>(POPULAR_ICONS)

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const query = searchQuery.value.trim()
    if (!query) {
      iconResults.value = POPULAR_ICONS
      return
    }
    loadingIcons.value = true
    try {
      const res = await searchIcons(query, { limit: 18 })
      iconResults.value = res.icons
    } catch (e) {
      console.error(e)
    } finally {
      loadingIcons.value = false
    }
  }, 300)
}

async function insertIcon(iconName: string) {
  try {
    const iconData = await fetchIcon(iconName)
    if (iconData.paths.length === 0) return

    const canvasEl = document.querySelector('canvas')
    const width = canvasEl ? canvasEl.clientWidth : 800
    const height = canvasEl ? canvasEl.clientHeight : 600
    const zoom = editor.state.zoom
    const x = (width / 2 - editor.state.panX) / zoom
    const y = (height / 2 - editor.state.panY) / zoom

    editor.undo.beginBatch('Insert Icon')

    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: iconName,
      width: iconData.width,
      height: iconData.height,
      fills: [],
      x: x - iconData.width / 2,
      y: y - iconData.height / 2
    })

    const STROKE_CAP_MAP: Record<string, string> = {
      butt: 'NONE',
      round: 'ROUND',
      square: 'SQUARE'
    }

    const STROKE_JOIN_MAP: Record<string, string> = {
      miter: 'MITER',
      round: 'ROUND',
      bevel: 'BEVEL'
    }

    for (const path of iconData.paths) {
      const vector = editor.graph.createNode('VECTOR', frame.id, {
        name: 'path',
        width: iconData.width,
        height: iconData.height,
        vectorNetwork: path.vectorNetwork
      })
      vector.x = 0
      vector.y = 0

      if (path.fill && path.fill !== 'none') {
        const fillColor =
          path.fill === 'currentColor' ? parseColor('#000000') : parseColor(path.fill)
        editor.graph.updateNode(vector.id, {
          fills: [{ type: 'SOLID', color: fillColor, opacity: 1, visible: true }]
        })
      } else if (path.fill === null && !path.stroke) {
        editor.graph.updateNode(vector.id, {
          fills: [{ type: 'SOLID', color: parseColor('#000000'), opacity: 1, visible: true }]
        })
      } else {
        editor.graph.updateNode(vector.id, { fills: [] })
      }

      if (path.stroke && path.stroke !== 'none') {
        const strokeColor =
          path.stroke === 'currentColor' ? parseColor('#000000') : parseColor(path.stroke)
        editor.graph.updateNode(vector.id, {
          strokes: [
            {
              color: strokeColor,
              weight: path.strokeWidth,
              opacity: 1,
              visible: true,
              align: 'CENTER',
              cap: (STROKE_CAP_MAP[path.strokeCap] ?? 'NONE') as StrokeCap,
              join: (STROKE_JOIN_MAP[path.strokeJoin] ?? 'MITER') as StrokeJoin
            }
          ]
        })
      }
    }

    editor.undo.commitBatch()
    editor.requestRender()
    editor.state.sceneVersion++
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
    <div
      data-test-id="toolbar"
      class="flex gap-0.5 items-center rounded-xl border border-border bg-panel p-1 shadow-lg"
    >
      <template v-for="tool in tools" :key="tool.key">
        <Tip
          v-if="tool.flyout && tool.flyout.length > 1"
          :label="`${toolLabels[activeKeyForTool(tool)]} (${tool.shortcut})`"
        >
          <ToolFlyout
            :tool="tool"
            :active-tool="activeTool"
            :tool-icons="toolIcons"
            :tool-labels="toolLabels"
            :tool-shortcuts="toolShortcuts"
            :ui="ui"
            @select="emit('setTool', $event)"
          />
        </Tip>

        <ToolbarItem v-else v-slot="{ active, actions }" :tool="tool.key">
          <Tip :label="`${toolLabels[tool.key]} (${tool.shortcut})`">
            <ToolButton
              :test-id="`toolbar-tool-${tool.key.toLowerCase()}`"
              :icon="toolIcons[tool.key]"
              :active="active || isActive(tool)"
              @click="actions.select"
            />
          </Tip>
        </ToolbarItem>
      </template>

      <!-- Custom Icon Popover -->
      <PopoverRoot>
        <PopoverTrigger as-child>
          <button
            class="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-transparent text-muted hover:bg-hover hover:text-surface transition-colors"
            title="Icons"
          >
            <icon-lucide-image class="size-4.5" />
          </button>
        </PopoverTrigger>

        <PopoverPortal>
          <PopoverContent
            side="top"
            :side-offset="8"
            align="center"
            class="z-50 w-72 rounded-xl border border-border bg-panel p-3 shadow-xl flex flex-col gap-2.5"
          >
            <!-- Search input -->
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search icons..."
              class="w-full rounded border border-border bg-input px-2.5 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
              @input="onSearch"
            />

            <!-- Icons Content -->
            <div class="flex-1 flex flex-col min-h-0">
              <div v-if="loadingIcons" class="py-6 text-center text-xs text-muted">Loading...</div>
              <div v-else-if="iconResults.length === 0" class="py-6 text-center text-xs text-muted">
                No icons found.
              </div>
              <div
                v-else
                class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-thin p-1"
              >
                <button
                  v-for="iconName in iconResults"
                  :key="iconName"
                  class="group flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-transparent bg-input/20 hover:border-accent/40 hover:bg-accent/5 p-2 transition-all duration-200 hover:scale-110"
                  :title="iconName"
                  @click="insertIcon(iconName)"
                >
                  <div
                    class="size-7 bg-[var(--color-muted)] group-hover:bg-[var(--color-surface)] transition-colors"
                    :style="{
                      mask: `url(https://api.iconify.design/${iconName.replace(':', '/')}.svg) no-repeat center`,
                      WebkitMask: `url(https://api.iconify.design/${iconName.replace(':', '/')}.svg) no-repeat center`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain'
                    }"
                  />
                </button>
              </div>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>
  </div>
</template>
