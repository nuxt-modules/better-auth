import type { AuthApiEndpointMethod, AuthApiEndpointPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import type { NitroFetchOptions } from 'nitropack/types'
import { useRequestFetch } from '#imports'

type AuthRequestFetchExtractedMethod<Options> = Options extends undefined
  ? 'get'
  : Lowercase<Extract<Exclude<Options extends { method?: infer Method } ? Method : never, undefined>, string>> extends infer NormalizedMethod extends string
    ? NormalizedMethod
    : 'get'

type AuthRequestFetchMethodFromOptions<Path extends AuthApiEndpointPath, Options> = NitroFetchOptions<Path> extends Options
  ? 'get'
  : AuthRequestFetchExtractedMethod<Options>

type AuthRequestFetchResolvedMethod<Path extends AuthApiEndpointPath, Options> = Extract<AuthRequestFetchMethodFromOptions<Path, Options>, AuthApiEndpointMethod<Path>> extends infer Method extends string
  ? Method extends never ? 'default' : Method
  : 'default'

type AuthRequestFetch = <
  Path extends AuthApiEndpointPath,
  Options extends NitroFetchOptions<Path> = NitroFetchOptions<Path>,
>(
  request: Path,
  opts?: Options,
) => Promise<AuthApiEndpointResponse<Path, Extract<AuthRequestFetchResolvedMethod<Path, Options>, AuthApiEndpointMethod<Path>>>>

export function useAuthRequestFetch() {
  return useRequestFetch() as AuthRequestFetch & ReturnType<typeof useRequestFetch>
}
