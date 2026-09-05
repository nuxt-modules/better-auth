import type { AuthApiEndpointMethod, AuthApiEndpointPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import { useRequestFetch } from '#imports'

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
  Path extends AuthApiEndpointPath,
  Options extends RequestFetchOptions = RequestFetchOptions,
>(
  request: Path,
  opts?: Options,
) => Promise<AuthApiEndpointResponse<Path, Extract<AuthRequestFetchResolvedMethod<Path, Options>, AuthApiEndpointMethod<Path>>>>

export function useAuthRequestFetch() {
  return useRequestFetch() as AuthRequestFetch & ReturnType<typeof useRequestFetch>
}
