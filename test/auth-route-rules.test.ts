import { describe, expect, it } from 'vitest'
import { assertSafeAuthRouteRules } from '../src/module/setup'

describe('auth route rule intersections', () => {
  it.each([
    ['/foo/*', '/*/bar'],
    ['/foo/:id', '/:category/bar'],
    ['/foo/**', '/*/bar'],
    ['/foo/:id/detail', '/*/bar/*'],
  ])('rejects overlapping %s and %s rules', (authPath, cachePath) => {
    expect(() => assertSafeAuthRouteRules({
      [authPath]: { auth: 'user' },
      [cachePath]: { cache: true },
    })).toThrow('/foo/bar')
  })

  it('rejects the remaining overlap beyond a literal exclusion', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/*/*': { auth: 'user' },
      '/*/bar/*': { cache: true },
      '/foo/bar/_': { auth: false },
    })).toThrow()
  })

  it('checks the matcher-resolved prefix of a named catchall', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/**:rest': { auth: 'user' },
      '/*/bar': { cache: true },
    })).toThrow('/foo:rest/bar')
  })

  it.each([{ auth: false }, { cache: false }])('allows a complete overlap exclusion %j', (exclusion) => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/*': { auth: 'user' },
      '/*/bar': { cache: true },
      '/foo/bar': exclusion,
    })).not.toThrow()
  })

  it('checks an inherited globstar beyond a literal exclusion', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/**': { auth: 'user', cache: true },
      '/foo': { auth: false },
      '/foo/_': { auth: false },
    })).toThrow()
  })

  it('checks overlapping globstars beyond an exact exclusion', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/**': { auth: 'user' },
      '/*/bar/**': { cache: true },
      '/foo/bar': { auth: false },
    })).toThrow()
  })

  it('allows a globstar exclusion covering the entire overlap', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/**': { auth: 'user' },
      '/*/bar/**': { cache: true },
      '/foo/bar/**': { auth: false },
    })).not.toThrow()
  })

  it('checks deeper paths beyond a single-segment exclusion', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/**': { auth: 'user', cache: true },
      '/foo': { auth: false },
      '/foo/*': { cache: false },
    })).toThrow()
  })

  it.each([
    { '/foo/:id': { auth: 'user' }, '/foo/*': { cache: true } },
    { '/foo/*': { cache: true }, '/foo/:id': { auth: 'user' } },
  ])('preserves matcher precedence for equivalent placeholder paths', (rules) => {
    expect(() => assertSafeAuthRouteRules(rules)).not.toThrow()
  })

  it('skips paths served by dev server handlers', () => {
    expect(() => assertSafeAuthRouteRules({
      '/**': { auth: 'user' },
      '/_fonts/**': { cache: { maxAge: 60 } },
    }, ['/_fonts'])).not.toThrow()
  })

  it('checks paths outside dev server handler routes', () => {
    expect(() => assertSafeAuthRouteRules({
      '/**': { auth: 'user' },
      '/_fonts/**': { cache: { maxAge: 60 } },
      '/_fontsx/**': { cache: { maxAge: 60 } },
    }, ['/_fonts'])).toThrow('/_fontsx')
  })

  it('checks wildcard intersections beyond a skipped representative path', () => {
    expect(() => assertSafeAuthRouteRules({
      '/foo/*/*': { auth: 'user' },
      '/*/bar/*': { cache: true },
    }, ['/foo/bar/_'])).toThrow('/foo/bar/__')
  })
})
