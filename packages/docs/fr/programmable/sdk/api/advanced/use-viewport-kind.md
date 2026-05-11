---
title: useViewportKind
description: Lit des indicateurs viewport mobile et bureau grossiers pour les shells d'éditeur adaptatifs.
---

# useViewportKind

`useViewportKind()` retourne de simples indicateurs adaptatifs utilisés par l'interface d'éditeur NexDesign.

Utilisez-le quand votre shell a besoin d'une légère abstraction au-dessus des points de rupture plutôt que de câbler `useBreakpoints()` directement.

## Utilisation

```ts
import { useViewportKind } from '@nex-design/vue'

const { isMobile, isDesktop } = useViewportKind()
```

## Retourne

- `isMobile`
- `isDesktop`

## API associées

- [useCanvas](../composables/use-canvas)
