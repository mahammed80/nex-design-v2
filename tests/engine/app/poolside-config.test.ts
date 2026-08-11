import { describe, expect, test } from 'bun:test'

import { getPoolsideProxyBaseUrl, POOLSIDE_MODEL_ID, POOLSIDE_MODEL_NAME } from '@/app/ai/poolside'

describe('Poolside agent configuration', () => {
  test('uses the fixed Laguna model and a proxy endpoint', () => {
    expect(POOLSIDE_MODEL_ID).toBe('poolside/laguna-s-2.1')
    expect(POOLSIDE_MODEL_NAME).toBe('Poolside Laguna S 2.1')
    expect(getPoolsideProxyBaseUrl()).toContain('/api/poolside/v1')
  })
})
