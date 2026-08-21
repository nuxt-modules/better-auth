import type { AuthApiEndpointMethod, AuthApiEndpointPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import { useRequestEvent, useRequestFetch, useRequestURL, useRuntimeConfig } from '#imports'

type RequestFetch = ReturnType<typeof useRequestFetch>
type RequestFetchRequest = Parameters<RequestFetch>[0]
type RequestFetchOptions = NonNullable<Parameters<RequestFetch>[1]>

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isLocalAuthMutation(request: RequestFetchRequest, options?: RequestFetchOptions): boolean {
  if (typeof request !== 'string')
    return false

  const pathname = request.split(/[?#]/, 1)[0]
  if (pathname !== '/api/auth' && !pathname?.startsWith('/api/auth/'))
    return false

  if (options?.baseURL && options.baseURL !== '/')
    return false

  const method = String(options?.method ?? 'GET').toUpperCase()
  return !SAFE_METHODS.has(method)
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

type AuthRequestFetchExtractedMethod<Options> = Options extends undefined
  ? 'get'
  : Lowercase<Extract<Exclude<Options extends { method?: infer Method } ? Method : never, undefined>, string>> extends infer NormalizedMethod extends string
    ? NormalizedMethod
    : 'get'

type AuthRequestFetchMethodFromOptions<Options> = RequestFetchOptions extends Options
  ? 'get'
  : AuthRequestFetchExtractedMethod<Options>

type AuthRequestFetchResolvedMethod<Path extends AuthApiEndpointPath, Options> = Extract<AuthRequestFetchMethodFromOptions<Options>, AuthApiEndpointMethod<Path>> extends infer Method extends string
  ? Method
  : never

type AuthRequestFetch = <
  Path extends AuthApiEndpointPath,
  Options extends RequestFetchOptions = RequestFetchOptions,
>(
  request: Path,
  opts?: Options,
) => Promise<AuthApiEndpointResponse<Path, Extract<AuthRequestFetchResolvedMethod<Path, Options>, AuthApiEndpointMethod<Path>>>>

export function useAuthRequestFetch() {
  const requestFetch = useRequestFetch()
  const requestEvent = useRequestEvent()
  if (!requestEvent)
    return requestFetch as AuthRequestFetch & RequestFetch

  const runtimeConfig = useRuntimeConfig()
  const authConfig = runtimeConfig.public.auth as { clientOnly?: boolean } | undefined
  if (authConfig?.clientOnly)
    return requestFetch as AuthRequestFetch & RequestFetch

  const requestOrigin = useRequestURL().origin

  return ((request: RequestFetchRequest, options?: RequestFetchOptions) => {
    if (!isLocalAuthMutation(request, options))
      return requestFetch(request, options)

    const headers = new Headers(options?.headers)
    if (!headers.has('origin')) {
      headers.set('origin', requestOrigin)
    }

    const normalizedHeaders = headersToRecord(headers)
    if (!options?.headers && Object.keys(normalizedHeaders).length === 0)
      return requestFetch(request, options)

    return requestFetch(request, {
      ...options,
      // H3 1.x spreads request option headers as an object, so normalize iterable
      // HeadersInit forms back to an enumerable record before crossing that boundary.
      headers: normalizedHeaders,
    })
  }) as AuthRequestFetch & RequestFetch
}
