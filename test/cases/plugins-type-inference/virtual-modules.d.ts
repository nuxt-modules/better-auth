declare module '#auth/database' {
  export const db: any
  export function createDatabase(...args: any[]): any
}

declare module '#auth/secondary-storage' {
  export function createSecondaryStorage(...args: any[]): any
}

declare module '#better-auth/nitro-compat' {
  export type ServerEvent = import('h3').H3Event
  export function createAuthError(status: number, statusText: string): Error
  export function defineEventHandler<T>(handler: T): T
  export function getQuery(event: any): Record<string, string | undefined>
  export function getRequestHost(event: any, options?: any): string
  export function getRequestProtocol(event: any, options?: any): string
  export function getRequestURL(event: any): URL
  export function getAuthRouteRules(event: any): Record<string, unknown>
  export function readBody<T>(event: any): Promise<T>
  export function splitCookiesString(header: string): string[]
  export function toWebRequest(event: any): Request
  export function useRuntimeConfig(): any
}
