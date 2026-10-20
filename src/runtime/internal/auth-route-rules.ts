import type { AuthRouteRules } from '../types'
import { withoutBase } from 'ufo'

// These namespaces serve public assets, not app routes or authentication endpoints.
const internalAssetPaths = ['/_fonts', '/_ipx', '/_nuxt', '/_scripts/assets', '/api/_nuxt_icon']

export function isInternalAssetPath(path: string, baseURL = '/'): boolean {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  const normalizedPathname = withoutBase(pathname, baseURL) || '/'
  return internalAssetPaths.some((prefix) => {
    return normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
  })
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

export function shouldSkipAuthRouteRules(path: string, baseURL = '/'): boolean {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  return isInternalAssetPath(pathname, baseURL) || internalRouteRuleAuthPaths.has(pathname) || internalRouteRuleAuthPrefixes.some(prefix => pathname.startsWith(prefix))
}
