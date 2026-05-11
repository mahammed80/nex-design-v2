---
title: provideEditor
description: Fournit une instance d'éditeur NexDesign à un sous-arbre Vue via l'injection.
---

# provideEditor

`provideEditor(editor)` rend un éditeur NexDesign disponible aux composables descendants et aux primitives headless via l'injection Vue.

C'est le fondement de `useEditor()`.

## Utilisation

```ts
import { provideEditor } from '@nex-design/vue'

provideEditor(editor)
```

## Exemple de base

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

## Notes

Le SDK actuel utilise `provideEditor()` et `useEditor()` directement. Certains exemples plus anciens et messages d'erreur font encore référence à un composant `NexDesignProvider`, mais le modèle d'injection est la vraie surface d'API à privilégier dans les docs et le code applicatif.

## API associées

- [useEditor](./use-editor)
