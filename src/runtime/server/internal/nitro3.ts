import type { H3Event } from 'nitro/h3'
import type { AuthRouteRules } from '../../types'
import { splitSetCookieString } from 'cookie-es'
import { getRouteRules } from 'nitro/app'
import {
  defineEventHandler,
  getQuery,
  getRequestHost,
  getRequestProtocol,
  getRequestURL,
  HTTPError,
  readBody,
} from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { normalizeAuthRouteRule } from '../../internal/auth-route-rules'

export {
  defineEventHandler,
  getQuery,
  getRequestHost,
  getRequestProtocol,
  getRequestURL,
  readBody,
  useRuntimeConfig,
}

export type ServerEvent = H3Event
export { splitSetCookieString as splitCookiesString }

export function getAuthRouteRules(event: ServerEvent): AuthRouteRules {
  const auth = getRouteRules(event.req.method, getRequestURL(event).pathname).routeRules?.auth
  return { auth: normalizeAuthRouteRule(auth) }
}

export function createAuthError(status: number, statusText: string): Error {
  return HTTPError.status(status, statusText)
}

export function toWebRequest(event: ServerEvent): Request {
  return event.req
}
