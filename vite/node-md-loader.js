import { readFile } from 'node:fs/promises'

export async function load(url, context, defaultLoad) {
  if (url.endsWith('.md')) {
    const content = await readFile(new URL(url), 'utf8')
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(content)};`
    }
  }
  return defaultLoad(url, context, defaultLoad)
}
