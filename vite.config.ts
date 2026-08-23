import process from 'node:process'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv } from 'vite'

import { createNexDesignAliases } from './vite/aliases'
import { localAutomationToken, nexDesignAutomationPlugin } from './vite/automation'
import { copyCanvasKitAssetsPlugin } from './vite/canvaskit-assets'
import { poolsideProxyPlugin } from './vite/poolside-proxy'
import { nexDesignPwaPlugin } from './vite/pwa'
import { rawMarkdownPlugin } from './vite/raw-markdown'
import { createDevServerOptions } from './vite/server'
import { urlFetchProxyPlugin } from './vite/url-fetch-proxy'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '')
  return {
    resolve: {
      alias: createNexDesignAliases(__dirname)
    },
    define: {
      __NEXDESIGN_LOCAL_AUTOMATION_TOKEN__: JSON.stringify(localAutomationToken(command))
    },
    plugins: [
      rawMarkdownPlugin(),
      copyCanvasKitAssetsPlugin(),
      tailwindcss(),
      Icons({ compiler: 'vue3' }),
      Components({ resolvers: [IconsResolver({ prefix: 'icon' })] }),
      nexDesignAutomationPlugin(command, host),
      poolsideProxyPlugin(env.POOLSIDE_API_KEY ?? ''),
      urlFetchProxyPlugin(),
      vue(),
      nexDesignPwaPlugin()
    ],
    clearScreen: false,
    build: {
      // WebView2 (Windows) is Chromium-based and supports ESNext natively.
      // Using 'esnext' skips unnecessary transpilation and produces smaller output.
      target: 'esnext',
      // esbuild is faster than terser and produces equivalent output for modern targets.
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Split heavy vendor deps into separate cacheable chunks.
          // The Tauri WebView2 process can parse these in parallel on startup.
          manualChunks(id: string) {
            if (id.includes('@ai-sdk/') || id.includes('/node_modules/ai/')) {
              return 'vendor-ai'
            }
            if (
              id.includes('/node_modules/yjs/') ||
              id.includes('/node_modules/y-indexeddb/') ||
              id.includes('/node_modules/y-protocols/') ||
              id.includes('/node_modules/lib0/')
            ) {
              return 'vendor-yjs'
            }
            if (id.includes('/node_modules/reka-ui/')) {
              return 'vendor-reka'
            }
            if (id.includes('@tauri-apps/')) {
              return 'vendor-tauri'
            }
          }
        }
      }
    },

    server: createDevServerOptions(host)
  }
})
