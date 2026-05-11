---
title: provideEditor
description: Proporciona una instancia del editor de NexDesign a un subárbol de Vue mediante inyección.
---

# provideEditor

`provideEditor(editor)` pone un editor de NexDesign a disposición de los composables descendientes y los primitivos headless a través de la inyección de Vue.

Esta es la base para `useEditor()`.

## Uso

```ts
import { provideEditor } from '@nex-design/vue'

provideEditor(editor)
```

## Ejemplo básico

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

## Notas

El SDK actual usa `provideEditor()` y `useEditor()` directamente. Algunos ejemplos y mensajes de error más antiguos aún hacen referencia a un componente `NexDesignProvider`, pero el modelo de inyección es la superficie de API real que hay que preferir en la documentación y el código de la app.

## APIs relacionadas

- [useEditor](./use-editor)
