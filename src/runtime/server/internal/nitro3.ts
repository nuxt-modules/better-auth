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
  return (getRouteRules(event.req.method, getRequestURL(event).pathname).routeRules ?? {}) as AuthRouteRules
}

export function createAuthError(status: number, statusText: string): Error {
  return HTTPError.status(status, statusText)
}

export function toWebRequest(event: ServerEvent): Request {
  return event.req
}

export function splitCookiesString(header: string): string[] {
  const cookies: string[] = []
  let position = 0

  while (position < header.length) {
    const start = position
    let separator: number | undefined

    while (position < header.length) {
      if (header[position] !== ',') {
        position += 1
        continue
      }

      separator = position
      position += 1
      while (position < header.length && /\s/.test(header[position]!))
        position += 1

      const nextStart = position
      while (position < header.length && !['=', ';', ','].includes(header[position]!))
        position += 1

      if (header[position] === '=') {
        cookies.push(header.slice(start, separator))
        position = nextStart
        break
      }

      position = separator + 1
    }

    if (separator === undefined || position >= header.length)
      cookies.push(header.slice(start))
  }

  return cookies
}
