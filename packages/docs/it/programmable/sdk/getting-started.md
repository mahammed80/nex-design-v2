---
title: Per Iniziare con l'SDK
description: Configura @nex-design/vue con createEditor, provideEditor e un canvas.
---

# Per Iniziare con l'SDK

## Installazione

```bash
bun add @nex-design/core @nex-design/vue canvaskit-wasm
```

L'SDK risiede oggi nel monorepo ed è pubblicato anche come `@nex-design/vue`.

```ts
import { createEditor } from '@nex-design/core/editor'
import { provideEditor, useCanvas } from '@nex-design/vue'
```

## Modello concettuale

Ci sono tre livelli:

1. `@nex-design/core` — motore editor indipendente dal framework
2. `@nex-design/vue` — composable Vue e primitive headless
3. la tua app — stile, routing, flussi di file, UI specifica del prodotto

## Configurazione minimale

### 1. Crea un editor

```ts
import { createEditor } from '@nex-design/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Forniscilo a Vue

```vue
<script setup lang="ts">
import { provideEditor } from '@nex-design/vue'

import type { Editor } from '@nex-design/core/editor'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

Puoi considerarlo il livello provider per l'albero dell'editor. La documentazione preferisce `provideEditor()` direttamente perché è la vera superficie API attuale.

### 3. Collega un canvas

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor } from '@nex-design/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Utilizzo dei composable

Una volta fornito l'editor, i componenti figli possono leggere la selezione e invocare comandi:

```ts
import { useEditorCommands, useSelectionState } from '@nex-design/vue'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Esempio base

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor, useSelectionState } from '@nex-design/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas ready')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Selected: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Prossimi passi

- [Architettura](./architecture)
- [Riferimento API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)
