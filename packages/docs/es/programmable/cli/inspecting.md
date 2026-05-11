---
title: Inspeccionar Archivos
description: Navega árboles de nodos, busca por nombre o tipo, y examina propiedades desde la terminal.
---

# Inspeccionar Archivos

El CLI te permite explorar archivos `.fig` sin abrir el editor. Cada comando también funciona con la aplicación en vivo — simplemente omite el argumento de archivo.

::: tip Instalar
```sh
bun add -g @nex-design/cli
# o
brew install nex-design/tap/nex-design
```
:::

## Información del Documento

Obtén un resumen rápido — cantidad de páginas, nodos totales, fuentes utilizadas, tamaño del archivo:

```sh
nex-design info design.fig
```

## Árbol de Nodos

Imprime la jerarquía completa de nodos:

```sh
nex-design tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Buscar Nodos

Buscar por tipo:

```sh
nex-design find design.fig --type TEXT
```

Buscar por nombre:

```sh
nex-design find design.fig --name "Button"
```

Ambos flags se pueden combinar para refinar aún más los resultados.

## Detalles del Nodo

Inspecciona todas las propiedades de un nodo específico por su ID:

```sh
nex-design node design.fig --id 1:23
```

## Páginas

Lista todas las páginas del documento:

```sh
nex-design pages design.fig
```

## Variables

Lista las variables de diseño y sus colecciones:

```sh
nex-design variables design.fig
```

## Modo Aplicación en Vivo

Cuando la aplicación de escritorio está en ejecución, omite el argumento de archivo — el CLI se conecta vía RPC y opera sobre el lienzo en vivo:

```sh
nex-design tree              # inspeccionar el documento en vivo
nex-design eval -c "..."     # consultar el editor
```

## Salida JSON

Todos los comandos soportan `--json` para salida legible por máquinas — envía a `jq`, alimenta scripts de CI, o procesa con otras herramientas:

```sh
nex-design tree design.fig --json | jq '.[] | .name'
```
