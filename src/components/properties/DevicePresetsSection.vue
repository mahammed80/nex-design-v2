<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/app/editor/active-store'

interface PresetItem {
  name: string
  w: number
  h: number
}

interface PresetGroup {
  category: string
  items: PresetItem[]
}

const store = useEditorStore()

const presetGroups: PresetGroup[] = [
  {
    category: 'Mobile - Apple',
    items: [
      { name: 'iPhone SE (3rd Gen)', w: 375, h: 667 },
      { name: 'iPhone 13 Mini', w: 375, h: 812 },
      { name: 'iPhone 14 / 15', w: 390, h: 844 },
      { name: 'iPhone 14 Pro', w: 393, h: 852 },
      { name: 'iPhone 14 Plus', w: 428, h: 926 },
      { name: 'iPhone 15 Plus', w: 430, h: 932 },
      { name: 'iPhone 15 Pro', w: 393, h: 852 },
      { name: 'iPhone 15 Pro Max', w: 430, h: 932 },
      { name: 'iPhone 16', w: 393, h: 852 },
      { name: 'iPhone 16 Plus', w: 430, h: 932 },
      { name: 'iPhone 16 Pro', w: 402, h: 874 },
      { name: 'iPhone 16 Pro Max', w: 440, h: 956 }
    ]
  },
  {
    category: 'Android',
    items: [
      { name: 'Small Android', w: 360, h: 640 },
      { name: 'Medium Android', w: 360, h: 800 },
      { name: 'Pixel 8', w: 412, h: 915 },
      { name: 'Pixel 8 Pro', w: 448, h: 998 },
      { name: 'Pixel 9', w: 412, h: 915 },
      { name: 'Pixel 9 Pro XL', w: 448, h: 998 },
      { name: 'Galaxy S24', w: 360, h: 780 },
      { name: 'Galaxy S24+', w: 384, h: 854 },
      { name: 'Galaxy S24 Ultra', w: 412, h: 915 },
      { name: 'Galaxy Z Fold (Open)', w: 768, h: 1024 },
      { name: 'Pixel Fold', w: 842, h: 1024 }
    ]
  },
  {
    category: 'Tablets',
    items: [
      { name: 'iPad Mini', w: 744, h: 1133 },
      { name: 'iPad 10.9', w: 820, h: 1180 },
      { name: 'iPad Air 11', w: 834, h: 1194 },
      { name: 'iPad Pro 11', w: 834, h: 1194 },
      { name: 'iPad Pro 13', w: 1024, h: 1366 },
      { name: 'Galaxy Tab S9', w: 800, h: 1280 },
      { name: 'Galaxy Tab S9 Ultra', w: 920, h: 1472 }
    ]
  },
  {
    category: 'Laptops',
    items: [
      { name: 'Small Laptop', w: 1280, h: 720 },
      { name: 'HD Laptop', w: 1366, h: 768 },
      { name: 'Full HD Laptop', w: 1920, h: 1080 },
      { name: 'QHD Laptop', w: 2560, h: 1440 },
      { name: '4K Laptop', w: 3840, h: 2160 }
    ]
  },
  {
    category: 'Desktop',
    items: [
      { name: 'Desktop Small', w: 1280, h: 800 },
      { name: 'Desktop Medium', w: 1440, h: 900 },
      { name: 'Desktop HD', w: 1600, h: 900 },
      { name: 'Desktop Full HD', w: 1920, h: 1080 },
      { name: 'Desktop 2K', w: 2560, h: 1440 },
      { name: 'Desktop 4K', w: 3840, h: 2160 }
    ]
  },
  {
    category: 'MacBook',
    items: [
      { name: 'MacBook Air 13', w: 1440, h: 900 },
      { name: 'MacBook Air 15', w: 1710, h: 1107 },
      { name: 'MacBook Pro 14', w: 1512, h: 982 },
      { name: 'MacBook Pro 16', w: 1728, h: 1117 },
      { name: 'Studio Display', w: 2560, h: 1440 },
      { name: 'Pro Display XDR', w: 3008, h: 1692 }
    ]
  },
  {
    category: 'Wearables',
    items: [
      { name: 'Apple Watch 41mm', w: 352, h: 430 },
      { name: 'Apple Watch 45mm', w: 396, h: 484 },
      { name: 'Apple Watch Ultra', w: 410, h: 502 }
    ]
  },
  {
    category: 'TV',
    items: [
      { name: 'HD TV', w: 1280, h: 720 },
      { name: 'Full HD TV', w: 1920, h: 1080 },
      { name: '4K TV', w: 3840, h: 2160 },
      { name: '8K TV', w: 7680, h: 4320 }
    ]
  },
  {
    category: 'Web',
    items: [
      { name: 'Small Web', w: 1280, h: 720 },
      { name: 'Medium Web', w: 1440, h: 900 },
      { name: 'Large Web', w: 1920, h: 1080 },
      { name: 'Ultra Wide', w: 2560, h: 1080 },
      { name: '4K Web', w: 3840, h: 2160 }
    ]
  },
  {
    category: 'Social Media',
    items: [
      { name: 'Instagram Post', w: 1080, h: 1080 },
      { name: 'Instagram Story', w: 1080, h: 1920 },
      { name: 'Facebook Cover', w: 1640, h: 624 },
      { name: 'YouTube Thumbnail', w: 1280, h: 720 },
      { name: 'YouTube Banner', w: 2560, h: 1440 },
      { name: 'TikTok', w: 1080, h: 1920 },
      { name: 'LinkedIn Post', w: 1200, h: 627 },
      { name: 'X (Twitter) Post', w: 1600, h: 900 }
    ]
  },
  {
    category: 'Print & Other',
    items: [
      { name: 'A4 Portrait', w: 2480, h: 3508 },
      { name: 'A4 Landscape', w: 3508, h: 2480 },
      { name: 'A3', w: 3508, h: 4961 },
      { name: 'Presentation 16:9', w: 1920, h: 1080 },
      { name: 'Presentation 4:3', w: 1024, h: 768 },
      { name: 'App Icon', w: 1024, h: 1024 },
      { name: 'Banner', w: 1920, h: 600 }
    ]
  }
]

// Expand the first few categories by default for good discoverability
const expandedGroups = ref<Record<string, boolean>>({
  'Mobile - Apple': true,
  Android: true,
  Web: true
})

function toggleGroup(category: string) {
  expandedGroups.value[category] = !expandedGroups.value[category]
}

function createFrame(preset: PresetItem) {
  const w = window.innerWidth - 480
  const h = window.innerHeight - 40
  const canvasX = w / 2 + 240
  const canvasY = h / 2 + 40
  const canvasPos = store.screenToCanvas(canvasX, canvasY)

  store.undo.beginBatch(`Create ${preset.name} frame`)
  const nodeId = store.createShape(
    'FRAME',
    Math.round(canvasPos.x - preset.w / 2),
    Math.round(canvasPos.y - preset.h / 2),
    preset.w,
    preset.h
  )
  store.updateNode(nodeId, { name: preset.name })
  store.select([nodeId])
  store.setTool('SELECT')
  store.undo.commitBatch()
  store.requestRender()
}
</script>

<template>
  <div class="flex flex-col h-full bg-panel">
    <!-- Header -->
    <div class="border-b border-border px-3 py-2">
      <span class="text-[11px] text-muted font-medium uppercase tracking-wider"
        >Device Frame Presets</span
      >
    </div>

    <!-- Collapsible list -->
    <div class="scrollbar-thin flex-1 overflow-y-auto">
      <div
        v-for="group in presetGroups"
        :key="group.category"
        class="border-b border-border last:border-b-0"
      >
        <!-- Group Header Toggle -->
        <button
          class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-surface hover:bg-hover transition-colors focus:outline-none"
          @click="toggleGroup(group.category)"
        >
          <span>{{ group.category }}</span>
          <span
            class="text-muted transition-transform duration-200"
            :class="expandedGroups[group.category] ? 'rotate-90' : 'rotate-0'"
          >
            <icon-lucide-chevron-right class="size-3.5" />
          </span>
        </button>

        <!-- Presets Items Grid/List -->
        <div v-if="expandedGroups[group.category]" class="px-2 pb-2 flex flex-col gap-0.5">
          <button
            v-for="item in group.items"
            :key="item.name"
            class="flex items-center justify-between rounded px-2 py-1.5 text-left text-[11px] text-muted hover:bg-accent/10 hover:text-accent transition-all cursor-pointer focus:outline-none"
            @click="createFrame(item)"
          >
            <span class="font-medium">{{ item.name }}</span>
            <span class="text-[10px] opacity-75 font-mono">{{ item.w }} × {{ item.h }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
