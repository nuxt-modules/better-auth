import type { AuthApiEndpointMethod, AuthApiEndpointPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import type { ClientAuthConfig } from '../../config'
import createAppAuthClient from '#auth/client'
import { joinURL } from 'ufo'
import { useRequestFetch, useRuntimeConfig } from '#imports'

type RequestFetchOptions = NonNullable<Parameters<ReturnType<typeof useRequestFetch>>[1]>

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
  Path extends AuthApiEndpointPath & ('/api/auth' | `/api/auth/${string}`),
  Options extends RequestFetchOptions = RequestFetchOptions,
>(
  request: Path,
  opts?: Options,
) => Promise<AuthApiEndpointResponse<Path, Extract<AuthRequestFetchResolvedMethod<Path, Options>, AuthApiEndpointMethod<Path>>>>

export function useAuthRequestFetch(): AuthRequestFetch & ReturnType<typeof useRequestFetch> {
  const requestFetch = useRequestFetch()
  const runtimeConfig = useRuntimeConfig()
  const authRuntimeConfig = runtimeConfig.public.auth as { clientOnly?: boolean } | undefined

  if (!authRuntimeConfig?.clientOnly)
    return requestFetch as AuthRequestFetch & ReturnType<typeof useRequestFetch>

  const siteUrl = runtimeConfig.public.siteUrl as string
  const clientOptions: ClientAuthConfig = createAppAuthClient.resolveOptions(siteUrl)
  const configuredBaseURL = clientOptions.baseURL ?? siteUrl
  // Better Auth treats a path in baseURL as the complete auth base path.
  const baseURL = configuredBaseURL && new URL(configuredBaseURL).pathname.replace(/\/+$/, '')
    ? configuredBaseURL
    : joinURL(configuredBaseURL || '/', clientOptions.basePath ?? '/api/auth')
  const externalRequestFetch = requestFetch as unknown as (request: Parameters<typeof requestFetch>[0], opts?: RequestFetchOptions) => Promise<unknown>
  // Keep Nuxt's request-scoped fetch so incoming cookies are forwarded during SSR.
  return ((request: Parameters<typeof requestFetch>[0], opts?: RequestFetchOptions) => {
    if (typeof request !== 'string' || !/^\/api\/auth(?=\/|$)/.test(request))
      return externalRequestFetch(request, opts)

    return externalRequestFetch(request.slice('/api/auth'.length), {
      ...opts,
      baseURL,
      credentials: 'include',
    })
  }) as AuthRequestFetch & ReturnType<typeof useRequestFetch>
}
