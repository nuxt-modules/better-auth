import type { H3Event } from 'h3'
import type { AuthRouteRules } from '../../types'
import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestHost,
  getRequestProtocol,
  getRequestURL,
  readBody,
  splitCookiesString,
  toWebRequest,
} from 'h3'
import { getRouteRules, useRuntimeConfig } from 'nitropack/runtime'

export {
  defineEventHandler,
  getQuery,
  getRequestHost,
  getRequestProtocol,
  getRequestURL,
  readBody,
  splitCookiesString,
  toWebRequest,
  useRuntimeConfig,
}

export type ServerEvent = H3Event

export function getAuthRouteRules(event: ServerEvent): AuthRouteRules {
  return getRouteRules(event) as AuthRouteRules
}

export function createAuthError(status: number, statusText: string): Error {
  return createError({ statusCode: status, statusMessage: statusText })
}
