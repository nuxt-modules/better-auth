import type { AuthRouteRules } from '../types'
import { withoutBase } from 'ufo'

// These namespaces serve public assets, not app routes or authentication endpoints.
const internalAssetPaths = ['/_fonts', '/_ipx', '/_nuxt', '/api/_nuxt_icon']

export function isInternalAssetPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  return internalAssetPaths.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

const internalRouteRuleAuthPaths = new Set([
  '/__better-auth-devtools',
  '/__nuxt_devtools__',
  '/__nuxt_error',
  '/__nuxt_vite_node__',
  '/api/_better-auth',
  '/api/auth',
])

const internalRouteRuleAuthPrefixes = [
  '/__nuxt_devtools__/',
  '/__nuxt_vite_node__/',
  '/api/_better-auth/',
  '/api/auth/',
]

export function normalizeAuthRoutePath(path: string, baseURL = '/'): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  return withoutBase(pathname, baseURL) || '/'
}

export function normalizeAuthRouteRule(rule: unknown): AuthRouteRules['auth'] {
  if (rule && typeof rule === 'object' && Object.hasOwn(rule, 'options'))
    return (rule as { options?: AuthRouteRules['auth'] }).options

  return rule as AuthRouteRules['auth']
}

export function shouldSkipAuthRouteRules(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  return isInternalAssetPath(pathname) || internalRouteRuleAuthPaths.has(pathname) || internalRouteRuleAuthPrefixes.some(prefix => pathname.startsWith(prefix))
}
