import { automationPlugin } from '../src/app/automation/bridge/vite-plugin'

// Use a stable dev token to prevent WebSocket token mismatches when Vite config hot-reloads
const devAutomationAuthToken = 'dev-token-nex-design'

export function localAutomationToken(command: string): string | null {
  return command === 'serve' ? devAutomationAuthToken : null
}

export function automationCorsOrigin(host: string | undefined): string {
  return host ? `http://${host}:1420` : 'http://localhost:1420'
}

export function nexDesignAutomationPlugin(command: string, host: string | undefined) {
  return automationPlugin(localAutomationToken(command), automationCorsOrigin(host))
}
