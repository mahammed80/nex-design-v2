import { describe, expect, test } from 'bun:test'

import { rewriteCssUrls, validateRemoteUrl } from '@nex-design/core/url-policy'

describe('URL import policy', () => {
  test('accepts public HTTP URLs and resolves public redirects', () => {
    expect(validateRemoteUrl('https://example.com/page').hostname).toBe('example.com')
    expect(
      validateRemoteUrl('../image.png', 'https://cdn.example.com/css/main.css').toString()
    ).toBe('https://cdn.example.com/image.png')
  })

  test('rejects credentials and private-network targets', () => {
    expect(() => validateRemoteUrl('http://localhost:3000')).toThrow()
    expect(() => validateRemoteUrl('http://127.0.0.1')).toThrow()
    expect(() => validateRemoteUrl('http://192.168.1.5')).toThrow()
    expect(() => validateRemoteUrl('https://user:password@example.com')).toThrow()
  })

  test('rewrites relative stylesheet assets without touching data URLs', () => {
    const css = rewriteCssUrls(
      '.hero{background:url(../img/hero.png)} .icon{background:url("data:image/svg+xml,ok")}',
      'https://cdn.example.com/assets/css/main.css'
    )
    expect(css).toContain('url(https://cdn.example.com/assets/img/hero.png)')
    expect(css).toContain('url("data:image/svg+xml,ok")')
  })
})
