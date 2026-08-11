interface RateLimitResult {
  success: boolean
}

interface RateLimiter {
  limit(options: { key: string }): Promise<RateLimitResult>
}

interface PoolsideEnvironment {
  POOLSIDE_API_KEY?: string
  AI_RATE_LIMITER?: RateLimiter
}

interface PagesContext {
  request: Request
  env: PoolsideEnvironment
}

const POOLSIDE_URL = 'https://inference.poolside.ai/v1/chat/completions'
const MAX_REQUEST_BYTES = 2_000_000

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: { message } }, { status })
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const apiKey = context.env.POOLSIDE_API_KEY?.trim()
  if (!apiKey) return errorResponse(503, 'Poolside is not configured.')
  if (!context.env.AI_RATE_LIMITER) return errorResponse(503, 'AI rate limiting is not configured.')

  const clientAddress = context.request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rateLimit = await context.env.AI_RATE_LIMITER.limit({ key: clientAddress })
  if (!rateLimit.success) return errorResponse(429, 'AI request limit reached. Try again later.')

  const declaredLength = Number(context.request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_REQUEST_BYTES) return errorResponse(413, 'AI request is too large.')
  const body = await context.request.arrayBuffer()
  if (body.byteLength > MAX_REQUEST_BYTES) return errorResponse(413, 'AI request is too large.')

  const upstream = await fetch(POOLSIDE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' }
  })
}
