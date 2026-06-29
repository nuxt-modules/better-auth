import { describe, expect, it } from 'vitest'
import { shouldSkipAuthRouteRules } from '../src/runtime/internal/auth-route-rules'

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
