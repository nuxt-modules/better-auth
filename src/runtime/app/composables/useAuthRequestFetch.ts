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
  type RequestFetch = ReturnType<typeof useRequestFetch>
  type FetchFunction = (request: Parameters<RequestFetch>[0], opts?: RequestFetchOptions) => Promise<unknown>

  // Preserve whichever fetch interface Nuxt supplies, including ofetch methods.
  function wrapRequestFetch(fetch: FetchFunction): FetchFunction {
    const methods = new Map<PropertyKey, unknown>()
    return new Proxy(fetch, {
      apply(target, thisArg, args) {
        const [request, opts] = args as [Parameters<RequestFetch>[0], RequestFetchOptions?]
        if (typeof request !== 'string' || !/^\/api\/auth(?=\/|$)/.test(request))
          return Reflect.apply(target, thisArg, args)

        return Reflect.apply(target, thisArg, [request.slice('/api/auth'.length), {
          ...opts,
          baseURL,
          credentials: 'include',
        }])
      },
      get(target, prop, receiver) {
        if (methods.has(prop))
          return methods.get(prop)
        const value = Reflect.get(target, prop, receiver)
        if (typeof value !== 'function' || (prop !== 'raw' && prop !== 'create'))
          return value
        const method = prop === 'raw'
          ? wrapRequestFetch(value as FetchFunction)
          : (...args: unknown[]) => wrapRequestFetch(Reflect.apply(value, target, args) as FetchFunction)
        methods.set(prop, method)
        return method
      },
    })
  }

  return wrapRequestFetch(requestFetch as unknown as FetchFunction) as AuthRequestFetch & RequestFetch
}
