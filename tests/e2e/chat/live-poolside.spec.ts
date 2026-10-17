import { readFileSync, writeFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const LIVE_API_ENABLED = process.env.TEST_REAL_LLM === '1'
const BUILD_PROMPT = readFileSync(new URL('./prompts/aurora-insights.md', import.meta.url), 'utf8')
const RENDER_SYSTEM_PROMPT = readFileSync(
  new URL('./prompts/poolside-render-system.md', import.meta.url),
  'utf8'
)
const POOLSIDE_API_URL = 'https://inference.poolside.ai/v1/chat/completions'
const POOLSIDE_REQUEST = {
  model: 'poolside/laguna-s-2.1',
  messages: [
    { role: 'system', content: RENDER_SYSTEM_PROMPT },
    { role: 'user', content: BUILD_PROMPT }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'render',
        description: 'Render a complete JSX design into the NexDesign canvas.',
        parameters: {
          type: 'object',
          properties: {
            jsx: { type: 'string', description: 'The complete NexDesign JSX tree.' }
          },
          required: ['jsx'],
          additionalProperties: false
        }
      }
    }
  ],
  tool_choice: 'required',
  max_tokens: 4096,
  stream: false
}

interface PoolsideRenderResponse {
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string
      tool_calls?: Array<{
        function?: { arguments?: string }
      }>
    }
  }>
}

interface RenderArguments {
  jsx?: unknown
}

async function requestPoolsideRenderOnce(page: Page): Promise<PoolsideRenderResponse> {
  return page.evaluate(async (requestBody) => {
    const response = await fetch('/api/poolside/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    const responseText = await response.text()
    if (!response.ok) {
      throw new Error(`Poolside proxy returned ${response.status}: ${responseText}`)
    }
    return JSON.parse(responseText) as PoolsideRenderResponse
  }, POOLSIDE_REQUEST)
}

async function requestPoolsideRender(page: Page): Promise<PoolsideRenderResponse> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await requestPoolsideRenderOnce(page)
    } catch (error) {
      lastError = error
      if (attempt < 3) await page.waitForTimeout(attempt * 1_000)
    }
  }
  throw lastError
}

async function requestPoolsideRenderDirect(): Promise<PoolsideRenderResponse> {
  const apiKey = process.env.POOLSIDE_API_KEY?.trim()
  if (!apiKey) throw new Error('POOLSIDE_API_KEY is required for direct live API testing')
  const response = await fetch(POOLSIDE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(POOLSIDE_REQUEST)
  })
  const responseText = await response.text()
  if (!response.ok) throw new Error(`Poolside returned ${response.status}: ${responseText}`)
  return JSON.parse(responseText) as PoolsideRenderResponse
}

function extractRenderJsx(payload: PoolsideRenderResponse): string {
  const choice = payload.choices?.[0]
  const argumentText = choice?.message?.tool_calls?.[0]?.function?.arguments
  if (!argumentText) {
    throw new Error(
      `Poolside response has no render tool call (finish=${choice?.finish_reason ?? 'unknown'}, content=${choice?.message?.content?.length ?? 0} chars)`
    )
  }
  const args = JSON.parse(argumentText) as RenderArguments
  if (typeof args.jsx !== 'string') throw new Error('Poolside did not return JSX')
  return args.jsx
}

async function executeRender(page: Page, jsx: string): Promise<void> {
  await page.evaluate(async (renderJsx) => {
    const store = window.nexDesign?.getStore?.()
    if (!store) throw new Error('NexDesign store not initialized')
    const modulePath = '/src/app/ai/tools/index.ts'
    const toolsModule = await import(/* @vite-ignore */ modulePath)
    const renderTool = toolsModule.createAITools(store).render
    if (!renderTool || typeof renderTool.execute !== 'function') {
      throw new Error('NexDesign render tool is unavailable')
    }
    await renderTool.execute(
      { jsx: renderJsx },
      {
        toolCallId: 'live-poolside-render',
        messages: [],
        abortSignal: new AbortController().signal
      }
    )
  }, jsx)
}

test.skip(!LIVE_API_ENABLED, 'Set TEST_REAL_LLM=1 to run the live Poolside generation check')

test('Poolside API builds and renders a complete UI screen', async ({ page }, testInfo) => {
  test.setTimeout(360_000)

  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/')
  const guestTrial = page.locator('[data-test-id="start-guest-trial"]')
  await expect(guestTrial).toBeVisible()
  await guestTrial.click()

  const createCanvas = page.getByTitle('Create New Canvas')
  await expect(createCanvas).toBeVisible()
  await createCanvas.click()

  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const replayPath = process.env.TEST_REAL_LLM_REPLAY
  const directApi = !replayPath && process.env.TEST_REAL_LLM_DIRECT === '1'
  const generatedJsx = replayPath
    ? readFileSync(replayPath, 'utf8')
    : extractRenderJsx(
        directApi ? await requestPoolsideRenderDirect() : await requestPoolsideRender(page)
      )
  await testInfo.attach('api-transport', {
    body: Buffer.from(
      replayPath ? 'saved-api-replay' : directApi ? 'direct-api' : 'same-origin-proxy'
    ),
    contentType: 'text/plain'
  })
  await testInfo.attach('generated-jsx', {
    body: Buffer.from(generatedJsx),
    contentType: 'text/plain'
  })
  await executeRender(page, generatedJsx)

  const result = await page.evaluate(async () => {
    const store = window.nexDesign?.getStore?.()
    if (!store) throw new Error('NexDesign store not initialized')
    const fontModulePath = '/packages/core/src/text/index.ts'
    const { fontManager } = await import(/* @vite-ignore */ fontModulePath)
    const roots = store.graph.getChildren(store.state.currentPageId)
    const screen = roots.find((node) => node.type === 'FRAME')
    if (!screen) {
      return { rootCount: roots.length, totalNodes: 0, texts: [], renderer: null, screen: null }
    }
    const signInLabel = [...store.graph.nodes.values()].find(
      (node) => node.type === 'TEXT' && node.text === 'Sign in'
    )
    const signInButton = signInLabel?.parentId
      ? store.graph.getNode(signInLabel.parentId)
      : undefined
    return {
      rootCount: roots.length,
      totalNodes: store.graph.countDescendants(screen.id),
      texts: [...store.graph.nodes.values()]
        .filter((node) => node.type === 'TEXT')
        .map((node) => ({
          text: node.text,
          width: node.width,
          height: node.height,
          fontFamily: node.fontFamily,
          fontWeight: node.fontWeight,
          fontLoaded: fontManager.isLoaded(node.fontFamily),
          fillCount: node.fills.filter((fill) => fill.visible).length
        })),
      renderer: {
        fontsLoaded: store.renderer?.fontsLoaded ?? false,
        hasFontProvider: Boolean(store.renderer?.fontProvider),
        hasTextFont: Boolean(store.renderer?.textFont)
      },
      signInButton:
        signInButton?.type === 'FRAME'
          ? {
              id: signInButton.id,
              labelId: signInLabel?.id,
              labelParentId: signInLabel?.parentId,
              layoutMode: signInButton.layoutMode,
              primaryAxisAlign: signInButton.primaryAxisAlign,
              counterAxisAlign: signInButton.counterAxisAlign,
              childIds: signInButton.childIds
            }
          : null,
      screen: {
        id: screen.id,
        name: screen.name,
        width: screen.width,
        height: screen.height,
        childCount: screen.childIds.length
      }
    }
  })

  expect(result.screen).not.toBeNull()
  expect(result.screen?.width).toBeGreaterThanOrEqual(450)
  expect(result.screen?.height).toBeGreaterThanOrEqual(300)
  expect(result.screen?.childCount).toBeGreaterThan(0)
  expect(result.totalNodes).toBeGreaterThanOrEqual(8)
  expect(result.texts.map(({ text }) => text)).toContain('Welcome back')
  expect(result.texts.map(({ text }) => text)).toContain('Sign in')
  expect(result.signInButton).toMatchObject({
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'CENTER'
  })
  expect(result.signInButton?.labelParentId).toBe(result.signInButton?.id)
  expect(result.signInButton?.childIds).toContain(result.signInButton?.labelId)
  expect(result.renderer).toEqual({ fontsLoaded: true, hasFontProvider: true, hasTextFont: true })
  expect(result.texts.every(({ fontLoaded }) => fontLoaded)).toBe(true)
  expect(browserErrors).toEqual([])

  await page.evaluate(() => window.nexDesign?.getStore?.().zoomToFit())
  await canvas.waitForRender()
  await page.waitForTimeout(1_000)

  const canvasPreview = testInfo.outputPath('poolside-canvas-preview.png')
  const editorPreview = testInfo.outputPath('poolside-editor-preview.png')
  const generatedJsxPath = testInfo.outputPath('poolside-generated.jsx')
  const sceneSummaryPath = testInfo.outputPath('poolside-scene-summary.json')
  writeFileSync(generatedJsxPath, generatedJsx)
  writeFileSync(sceneSummaryPath, JSON.stringify(result, null, 2))
  await page.locator('[data-test-id="canvas-area"]').screenshot({ path: canvasPreview })
  await page.screenshot({ path: editorPreview, fullPage: true })
  await testInfo.attach('generated-jsx-file', { path: generatedJsxPath, contentType: 'text/plain' })
  await testInfo.attach('scene-summary', {
    path: sceneSummaryPath,
    contentType: 'application/json'
  })
  await testInfo.attach('canvas-preview', { path: canvasPreview, contentType: 'image/png' })
  await testInfo.attach('editor-preview', { path: editorPreview, contentType: 'image/png' })
})
