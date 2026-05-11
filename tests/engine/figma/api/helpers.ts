import { FigmaAPI, SceneGraph } from '@nex-design/core'
export function createAPI(): FigmaAPI {
  return new FigmaAPI(new SceneGraph())
}
