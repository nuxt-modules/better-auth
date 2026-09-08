import type { H3Event } from 'nitro/h3'
import type { AuthRouteRules } from '../../types'
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

export function getAuthRouteRules(event: ServerEvent): AuthRouteRules {
  const auth = getRouteRules(event.req.method, getRequestURL(event).pathname).routeRules.auth?.options
  return { auth: auth as AuthRouteRules['auth'] }
}

export function createAuthError(status: number, statusText: string): Error {
  return HTTPError.status(status, statusText)
}

export function toWebRequest(event: ServerEvent): Request {
  return event.req
}

export function splitCookiesString(header: string): string[] {
  const cookies: string[] = []
  let start = 0
  let inQuotes = false
  for (let i = 0; i < header.length; i++) {
    const char = header[i]
    if (char === '"' && header[i - 1] !== '\\') {
      inQuotes = !inQuotes
      continue
    }
    if (char !== ',' || inQuotes)
      continue

    let position = i + 1
    while (position < header.length && /\s/.test(header[position]!))
      position += 1
    let tokenEnd = position
    while (tokenEnd < header.length && !['=', ';', ','].includes(header[tokenEnd]!))
      tokenEnd += 1
    if (header[tokenEnd] === '=') {
      cookies.push(header.slice(start, i))
      start = position
      i = position - 1
    }
  }
  cookies.push(header.slice(start))
  return cookies
}
