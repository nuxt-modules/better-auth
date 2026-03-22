import { describe, expect, it } from 'vitest'
import {
  getBaseURL,
  getDevTrustedOrigins,
  getNitroOrigin,
  resolveConfiguredSiteUrl,
  resolveEnvironmentOrigin,
  withDevTrustedOrigins,
} from '../src/nitro/runtime/server/internal/base-url'

describe('nitro base URL resolution', () => {
  it('prefers an explicit siteUrl', () => {
    expect(resolveConfiguredSiteUrl({ public: { siteUrl: 'https://explicit.example.com' } })).toBe('https://explicit.example.com')
    expect(getBaseURL({ public: { siteUrl: 'https://explicit.example.com' } })).toBe('https://explicit.example.com')
  })

  it('falls back to Nitro host detection in development', () => {
    expect(getNitroOrigin({
      env: {
        NITRO_HOST: 'localhost',
        NITRO_PORT: '3001',
      },
      isDev: true,
    })).toBe('http://localhost:3001')
  })

  it('falls back to deployment environment variables', () => {
    expect(resolveEnvironmentOrigin({
      env: {
        VERCEL_URL: 'my-app.vercel.app',
      },
      isDev: false,
    })).toEqual({
      origin: 'https://my-app.vercel.app',
      source: 'VERCEL_URL',
    })
  })

  it('uses a localhost dev fallback when no other signal exists', () => {
    expect(getBaseURL({ public: {} }, undefined, {
      env: {},
      isDev: true,
    })).toBe('http://localhost:3000')
  })

  it('adds localhost and request origins to trusted origins in dev', async () => {
    const merged = withDevTrustedOrigins(['https://foo.workers.dev'], {
      env: {
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: '4000',
      },
      hasExplicitSiteUrl: true,
      isDev: true,
    })

    expect(getDevTrustedOrigins({
      env: {
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: '4000',
      },
      isDev: true,
    })).toEqual(['http://localhost:4000', 'http://127.0.0.1:4000'])

    const resolved = await merged?.(new Request('http://127.0.0.1:4000/api/test'))
    expect(resolved).toContain('https://foo.workers.dev')
    expect(resolved).toContain('http://localhost:4000')
    expect(resolved).toContain('http://127.0.0.1:4000')
  })
})
