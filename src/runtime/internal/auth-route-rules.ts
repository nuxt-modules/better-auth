const internalRouteRuleAuthPaths = new Set([
  '/_ipx',
  '/_nuxt',
  '/__better-auth-devtools',
  '/__nuxt_devtools__',
  '/__nuxt_error',
  '/__nuxt_vite_node__',
  '/api/_better-auth',
  '/api/_nuxt_icon',
  '/api/auth',
])

const internalRouteRuleAuthPrefixes = [
  '/_ipx/',
  '/_nuxt/',
  '/__nuxt_devtools__/',
  '/__nuxt_vite_node__/',
  '/api/_better-auth/',
  '/api/_nuxt_icon/',
  '/api/auth/',
]

export function shouldSkipAuthRouteRules(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] || '/'
  return internalRouteRuleAuthPaths.has(pathname) || internalRouteRuleAuthPrefixes.some(prefix => pathname.startsWith(prefix))
}
