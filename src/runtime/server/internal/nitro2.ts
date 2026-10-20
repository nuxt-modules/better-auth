import type { H3Event } from 'h3'
import type { IncomingMessage } from 'node:http'
import type { AuthRouteRules } from '../../types'
import { splitSetCookieString } from 'cookie-es'
import { createError, defineEventHandler } from 'h3'
import { getRouteRules, useRuntimeConfig } from 'nitropack/runtime'

export {
  defineEventHandler,
  useRuntimeConfig,
}

export type ServerEvent = H3Event
type Nitro2Event = ServerEvent & { path?: string, node?: { req?: IncomingMessage }, web?: { request?: Request } }

// Nitro 2's dev server still serializes errors with h3 v1. Mark auth errors
// as h3 errors so that renderer keeps their status instead of wrapping them
// as an unhandled 500 error. h3 v2 recognizes the same shape by name/status.
// Nitro 2 still serializes errors with h3 v1 while the module runs on h3 v2.
// Create the native h3 v2 error so its pipeline preserves the status, then
// provide the legacy constructor marker used by Nitro 2's renderer.
function createNitro2AuthError(status: number, statusText: string): Error {
  const error = createError({ statusCode: status, statusMessage: statusText })
  const markerConstructor = function Nitro2ErrorConstructor() {}
  Object.defineProperty(markerConstructor, '__h3_error__', { value: true })
  Object.defineProperty(error, 'constructor', { value: markerConstructor })
  Object.defineProperties(error, {
    // Nitro's bundled h3 v1 may inspect the thrown value after the error
    // crosses a handler boundary, so retain the marker on the instance too.
    __h3_error__: { value: true, configurable: true, enumerable: true, writable: true },
    // Nitro 2's bundled h3 v1 serializer reads the legacy field names,
    // while h3 v2 exposes the status through statusCode/statusMessage.
    status: { value: status, configurable: true, enumerable: true, writable: true },
    statusText: { value: statusText, configurable: true, enumerable: true, writable: true },
    statusCode: { value: status, configurable: true, enumerable: true, writable: true },
    statusMessage: { value: statusText, configurable: true, enumerable: true, writable: true },
    // Nitro 2's bundled h3 v1 also uses these fields when normalizing an
    // error that crossed a dev-server handler boundary.
    unhandled: { value: false, configurable: true, enumerable: true, writable: true },
    fatal: { value: false, configurable: true, enumerable: true, writable: true },
  })
  return error
}

// Nitro 2 events expose Node's IncomingMessage while h3 v2 helpers expect a
// Web Request based event. Keep this shim independent of h3's event shape so
// Nitro 2 hosts continue to work when the project installs h3 v2.
function requestHeaders(event: ServerEvent): IncomingMessage['headers'] {
  return (event as Nitro2Event).node?.req?.headers ?? {}
}

export function getRequestHost(event: ServerEvent, options: { xForwardedHost?: boolean } = {}): string {
  const headers = requestHeaders(event)
  if (options.xForwardedHost) {
    const forwarded = headers['x-forwarded-host']
    const host = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()
    if (host)
      return host
  }
  const host = headers.host
  return (Array.isArray(host) ? host[0] : host) || 'localhost'
}

export function getRequestProtocol(event: ServerEvent, options: { xForwardedProto?: boolean } = {}): string {
  const headers = requestHeaders(event)
  if (options.xForwardedProto !== false && headers['x-forwarded-proto'] === 'https')
    return 'https'
  return (event as Nitro2Event).node?.req?.socket && (event as Nitro2Event).node.req.socket['encrypted' as never] ? 'https' : 'http'
}

export function getRequestURL(event: ServerEvent): URL {
  const req = (event as Nitro2Event).node?.req ?? {}
  const path = req.originalUrl || req.url || (event as Nitro2Event).path || '/'
  return new URL(path, `${getRequestProtocol(event)}://${getRequestHost(event)}`)
}

export function getQuery(event: ServerEvent): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  for (const [key, value] of getRequestURL(event).searchParams) {
    const previous = query[key]
    query[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value]
  }
  return query
}

export function toWebRequest(event: ServerEvent): Request {
  const req = (event as Nitro2Event).node?.req
  const webRequest = (event as Nitro2Event).web?.request
  if (webRequest)
    return webRequest
  const init: RequestInit & { duplex?: 'half' } = {
    method: req?.method,
    headers: req?.headers
      ? Object.fromEntries(Object.entries(req.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(', ') : value]]))
      : undefined,
    duplex: 'half',
  }
  if (req?.method !== 'GET' && req?.method !== 'HEAD')
    init.body = req as unknown as BodyInit
  return new Request(getRequestURL(event), init)
}

export async function readBody(event: ServerEvent): Promise<unknown> {
  const request = toWebRequest(event)
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json'))
    return request.json()
  if (contentType.includes('application/x-www-form-urlencoded'))
    return Object.fromEntries((await request.text()).split('&').filter(Boolean).map(pair => pair.split('=').map(decodeURIComponent)))
  return request.text()
}

export function splitCookiesString(cookiesString: string | string[]): string[] {
  return splitSetCookieString(cookiesString)
}

export function getAuthRouteRules(event: ServerEvent): AuthRouteRules {
  // h3 v2 events created by Nitro 2 compatibility handlers may omit the
  // legacy context and path properties. Nitro's route-rules helper stores its
  // cache there and reads the path directly from the event.
  const eventWithContext = event as unknown as { context?: Record<string, unknown>, path?: string }
  if (!eventWithContext.context)
    eventWithContext.context = {}
  if (!eventWithContext.path)
    eventWithContext.path = getRequestURL(event).pathname
  // Dev handlers may fall through before Nitro has initialized route rules on
  // the event. Treat that as an unruled route so auth middleware can continue
  // and apply the configured protection instead of throwing on `rules.auth`.
  // A dev server handler can invoke middleware before Nitro has fully
  // initialized its route-rule state. In that case the Nitro helper may
  // throw; the caller can still resolve the generated auth rules below.
  try {
    return (getRouteRules(event) as AuthRouteRules | undefined) || {}
  }
  catch {
    return {}
  }
}

export function createAuthError(status: number, statusText: string): Error {
  return createNitro2AuthError(status, statusText)
}
