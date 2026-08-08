import { spawn, execSync } from 'node:child_process'

import type { Plugin } from 'vite'

function hasBun(): boolean {
  try {
    execSync('bun --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// TODO: production — bundle MCP server as Tauri sidecar or spawn via shell plugin
export function automationPlugin(authToken: string | null, corsOrigin: string): Plugin {
  let child: ReturnType<typeof spawn> | null = null

  return {
    name: 'nex-design-automation',
    configureServer() {
      if (child) return

      const useBun = hasBun()
      const cmd = useBun ? 'bun' : 'node'
      const args = useBun
        ? ['run', 'packages/mcp/src/index.ts']
        : ['--import', 'tsx', '--loader', './vite/node-md-loader.js', 'packages/mcp/src/index.ts']

      child = spawn(cmd, args, {
        stdio: ['ignore', 'inherit', 'pipe'],
        shell: useBun && process.platform === 'win32',
        env: {
          ...process.env,
          PORT: '7600',
          WS_PORT: '7601',
          ...(authToken ? { NEXDESIGN_MCP_AUTH_TOKEN: authToken } : {}),
          NEXDESIGN_MCP_CORS_ORIGIN: corsOrigin
        }
      })

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        if (text.includes('EADDRINUSE')) {
          console.error(
            '\x1b[31m[MCP] Port 7600 already in use. Is another NexDesign instance running?\x1b[0m'
          )
          child?.kill()
          child = null
          return
        }
        process.stderr.write(data)
      })

      child.on('exit', (code) => {
        if (code && code !== 0 && child) {
          console.error(`[MCP] Server exited with code ${code}`)
        }
        child = null
      })
    },
    buildEnd() {
      child?.kill()
      child = null
    }
  }
}
