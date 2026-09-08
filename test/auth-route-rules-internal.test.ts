import { describe, expect, it } from 'vitest'
import { normalizeAuthRoutePath, normalizeAuthRouteRule, shouldSkipAuthRouteRules } from '../src/runtime/internal/auth-route-rules'

describe('auth route path normalization', () => {
  it('removes the app base URL from API paths', () => {
    expect(normalizeAuthRoutePath('/dashboard/api/private?preview=true', '/dashboard/')).toBe('/api/private')
    expect(normalizeAuthRoutePath('/api/private', '/dashboard/')).toBe('/api/private')
    expect(normalizeAuthRoutePath('/dashboard', '/dashboard/')).toBe('/')
  })
})

describe('nitro auth route rule normalization', () => {
  it('keeps current direct route rule values', () => {
    const rule = { only: 'user' as const, user: { role: 'admin' } }

    expect(normalizeAuthRouteRule('user')).toBe('user')
    expect(normalizeAuthRouteRule(rule)).toBe(rule)
  })

  it('unwraps route rule values returned by older Nitro 3 builds', () => {
    expect(normalizeAuthRouteRule({
      route: '/api/private',
      options: 'guest',
    })).toBe('guest')
  })
})

describe('internal auth route rule defaults', () => {
  it('skips framework and module internals', () => {
    expect(shouldSkipAuthRouteRules('/_nuxt/app.js')).toBe(true)
    expect(shouldSkipAuthRouteRules('/_ipx/w_64/icon.png')).toBe(true)
    expect(shouldSkipAuthRouteRules('/api/_nuxt_icon/lucide:home.svg')).toBe(true)
    expect(shouldSkipAuthRouteRules('/api/_better-auth/config')).toBe(true)
    expect(shouldSkipAuthRouteRules('/api/auth/get-session')).toBe(true)
  })

  it('keeps app routes and app APIs protectable', () => {
    expect(shouldSkipAuthRouteRules('/app')).toBe(false)
    expect(shouldSkipAuthRouteRules('/_app')).toBe(false)
    expect(shouldSkipAuthRouteRules('/api/test/me')).toBe(false)
    expect(shouldSkipAuthRouteRules('/api/authenticate')).toBe(false)
  })
})
