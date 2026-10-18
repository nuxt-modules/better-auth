import { joinURL } from 'ufo'

/** Better Auth treats a path in baseURL as the complete auth endpoint path. */
export function resolveAuthBaseURL(siteUrl: string, appBaseURL?: string): string {
  const origin = new URL(siteUrl).origin
  return appBaseURL && appBaseURL !== '/'
    ? joinURL(origin, appBaseURL, '/api/auth')
    : origin
}
