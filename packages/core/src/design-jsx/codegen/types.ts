import type { SceneGraph } from '#core/scene-graph'

export type CodegenLanguage =
  | 'tailwind'
  | 'css'
  | 'react'
  | 'vue'
  | 'flutter'
  | 'swiftui'

export interface CodegenResult {
  language: CodegenLanguage
  code: string
  syntax: string
  filename: string
}

export interface CodegenContext {
  graph: SceneGraph
  indent?: number
}
