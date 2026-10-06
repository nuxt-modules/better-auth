import type { RequestEvent } from 'nuxt/server'
import type { AuthRouteRules } from '../../types'
import { splitSetCookieString } from 'cookie-es'
import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestHost,
  getRequestProtocol,
  getRequestURL,
  getRouteRules,
  readBody,
  useRuntimeConfig,
} from 'nuxt/server'
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

export type ServerEvent = RequestEvent
export { splitSetCookieString as splitCookiesString }

export function getAuthRouteRules(event: ServerEvent): AuthRouteRules {
  const rules = getRouteRules(event) as { auth?: unknown }
  return { auth: normalizeAuthRouteRule(rules.auth) }
}

export function createAuthError(status: number, statusText: string): Error {
  return createError({ status, statusText })
}

export function toWebRequest(event: ServerEvent): Request {
  return event.req
}
