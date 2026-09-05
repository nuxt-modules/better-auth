import { addTypeTemplate } from '@nuxt/kit'

interface RegisterServerTypeTemplatesInput {
  serverConfigPath: string
  hasHubDb: boolean
  runtimeTypesPath: string
  sharedServerConfigSafe: boolean
  h3TypesPath: 'h3' | 'nitro/h3'
  nitroTypesPath: 'nitropack/types' | 'nitro/types'
}

export function registerServerTypeTemplates(input: RegisterServerTypeTemplatesInput): void {
  const { serverConfigPath, hasHubDb, runtimeTypesPath, sharedServerConfigSafe, h3TypesPath, nitroTypesPath } = input
  const routeRuleAugmentations = (nitroTypesPath === 'nitro/types'
    ? [nitroTypesPath]
    : ['nitropack', nitroTypesPath])
    .map(moduleName => `declare module '${moduleName}' {
  interface NitroRouteRules {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
  interface NitroRouteConfig {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
}`)
    .join('\n')
  const serverConfigTypeTemplateOptions = sharedServerConfigSafe
    ? { nuxt: true, nitro: true, node: true, shared: true }
    : { nuxt: true, nitro: true, node: true }

  addTypeTemplate({
    filename: 'types/auth-database.d.ts',
    getContents: () => `
declare module '#auth/database' {
  import type { BetterAuthOptions } from 'better-auth'
  export function createDatabase(event?: import('${h3TypesPath}').H3Event): BetterAuthOptions['database']
  export const db: ${hasHubDb ? `typeof import('@nuxthub/db')['db']` : 'undefined'}
}
`,
  }, { nitro: true })

  addTypeTemplate({
    filename: 'types/auth-schema.d.ts',
    getContents: () => `
declare module '#auth/schema' {
  export const user: any
  export const session: any
  export const account: any
  export const verification: any
  export const schema: {
    user: any
    session: any
    account: any
    verification: any
    [key: string]: any
  } | undefined
}
`,
  }, { nitro: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-server-context.d.ts',
    getContents: () => `
/// <reference path="./nitro-imports.d.ts" />
/// <reference path="./auth-database.d.ts" />
/// <reference path="./auth-schema.d.ts" />
${hasHubDb ? '/// <reference path="../hub/db.d.ts" />' : ''}

export {}
`,
  }, { node: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-config-context.d.ts',
    getContents: () => `
import type { RuntimeConfig } from 'nuxt/schema'

declare module '@nuxtjs/better-auth/config' {
  interface ServerAuthContextExtension {
    runtimeConfig: RuntimeConfig
    db: ${hasHubDb ? `typeof import('@nuxthub/db')['db']` : 'undefined'}
    requestOrigin?: string
  }
}

`,
  }, { nuxt: true, nitro: true, node: true, shared: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-infer.d.ts',
    getContents: () => `
import type { BetterAuthOptions, BetterAuthPlugin, InferPluginTypes, UnionToIntersection } from 'better-auth'
import type { InferFieldsInputClient, InferFieldsOutput } from 'better-auth/db'
import type createServerAuth from '${serverConfigPath}'

type _RawConfig = ReturnType<typeof createServerAuth>
type _RawPlugins = _RawConfig extends { plugins: infer P } ? P : _RawConfig extends { plugins?: infer P } ? P : []
type _NormalizedPlugins = _RawPlugins extends readonly (infer T)[]
  ? Array<T & BetterAuthPlugin>
  : _RawPlugins extends (infer T)[]
      ? Array<T & BetterAuthPlugin>
      : BetterAuthPlugin[]
type _Config = Omit<BetterAuthOptions, 'plugins'> & Omit<_RawConfig, 'plugins'> & {
  plugins?: _NormalizedPlugins
}

type _InferModelFieldsFromPlugins<P, M extends string> = P extends readonly (infer Plugin)[]
  ? UnionToIntersection<Plugin extends { schema: { [K in M]: { fields: infer F } } } ? InferFieldsOutput<F> : {}>
  : P extends (infer Plugin)[]
      ? UnionToIntersection<Plugin extends { schema: { [K in M]: { fields: infer F } } } ? InferFieldsOutput<F> : {}>
      : {}

type _InferModelFieldsFromOptions<C, M extends 'user' | 'session'> = C extends { [K in M]: { additionalFields: infer F } }
  ? InferFieldsOutput<F>
  : {}

type _UserFields = NonNullable<NonNullable<BetterAuthOptions['user']>['additionalFields']>

type _InferUserInputFromPlugins<P> = P extends readonly (infer Plugin)[]
  ? UnionToIntersection<Plugin extends { schema: { user: { fields: infer F extends _UserFields } } } ? InferFieldsInputClient<F> : {}>
  : {}

type _UserInputFallback = Partial<_InferUserInputFromPlugins<_RawPlugins> & (
  _RawConfig extends { user: { additionalFields: infer F extends _UserFields } }
    ? InferFieldsInputClient<F>
    : {}
)>

type _UserFallback = _InferModelFieldsFromPlugins<_RawPlugins, 'user'> & _InferModelFieldsFromOptions<_RawConfig, 'user'>
type _SessionFallback = _InferModelFieldsFromPlugins<_RawPlugins, 'session'> & _InferModelFieldsFromOptions<_RawConfig, 'session'>

declare module '#nuxt-better-auth' {
  interface AuthUser extends _UserFallback {}
  interface AuthUserUpdateInput extends _UserInputFallback {}
  interface AuthSession extends _SessionFallback {}
  type PluginTypes = InferPluginTypes<_Config>
}
`,
  }, serverConfigTypeTemplateOptions)

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-social-providers.d.ts',
    getContents: () => `
import type createServerAuth from '${serverConfigPath}'

type _RawConfig = ReturnType<typeof createServerAuth>
type _RawSocialProviders = _RawConfig extends { socialProviders: infer S } ? S : _RawConfig extends { socialProviders?: infer S } ? S : {}
type _SocialProviderIds = Extract<keyof NonNullable<_RawSocialProviders>, string>

declare module '#nuxt-better-auth' {
  interface AuthSocialProviderRegistry {
    ids: _SocialProviderIds
  }
}
`,
  }, serverConfigTypeTemplateOptions)

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-endpoints.d.ts',
    getContents: () => `
import type createServerAuth from '${serverConfigPath}'
import type { BetterAuthOptions } from 'better-auth'
import type { getEndpoints } from 'better-auth/api'
import type { Serialize, Simplify } from '${nitroTypesPath}'
import type { FetchError } from 'ofetch'

type _RawConfig = ReturnType<typeof createServerAuth>
type _RawPlugins = _RawConfig extends { plugins: infer P } ? P : _RawConfig extends { plugins?: infer P } ? P : []
type _Config = Omit<BetterAuthOptions, 'plugins'> & Omit<_RawConfig, 'plugins'> & {
  plugins?: _RawPlugins
}

type _AuthApi = ReturnType<typeof getEndpoints<_Config>>['api']
type _NormalizeMethod<M extends string> = M extends '*' ? 'default' : Lowercase<M>
type _RouteMethodFromOption<M> = M extends readonly (infer T)[]
  ? _NormalizeMethod<Extract<T, string>>
  : M extends string
      ? _NormalizeMethod<M>
      : 'default'
type _RouteMethodFromEndpoint<E> = E extends { options: { method: infer M } } ? _RouteMethodFromOption<M> : 'default'
type _RoutePathFromEndpoint<E> = E extends { path: infer P extends string }
  ? string extends P
      ? never
      : \`/api/auth\${P}\`
  : never
type _RouteResponseFromEndpoint<E> = E extends (...args: any[]) => Promise<infer R> ? Simplify<Serialize<Awaited<R>>> : never
type _RouteDefaultResponse<E> = never
type _UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never

type _CoreAuthInternalApi = {
  [K in keyof _AuthApi as _RoutePathFromEndpoint<_AuthApi[K]>]: {
    [M in _RouteMethodFromEndpoint<_AuthApi[K]> | 'default']: M extends 'default' ? _RouteDefaultResponse<_AuthApi[K]> : _RouteResponseFromEndpoint<_AuthApi[K]>
  }
}
type _PluginEndpointMaps<Plugins> = Plugins extends readonly (infer Plugin)[]
  ? Plugin extends { endpoints: infer Endpoints extends Record<string, unknown> }
      ? {
          [K in keyof Endpoints as _RoutePathFromEndpoint<Endpoints[K]>]: {
            [M in _RouteMethodFromEndpoint<Endpoints[K]> | 'default']: M extends 'default' ? _RouteDefaultResponse<Endpoints[K]> : _RouteResponseFromEndpoint<Endpoints[K]>
          }
        }
      : {}
  : Plugins extends (infer Plugin)[]
      ? Plugin extends { endpoints: infer Endpoints extends Record<string, unknown> }
          ? {
              [K in keyof Endpoints as _RoutePathFromEndpoint<Endpoints[K]>]: {
                [M in _RouteMethodFromEndpoint<Endpoints[K]> | 'default']: M extends 'default' ? _RouteDefaultResponse<Endpoints[K]> : _RouteResponseFromEndpoint<Endpoints[K]>
              }
            }
          : {}
      : {}
type _PluginAuthInternalApi = _UnionToIntersection<_PluginEndpointMaps<_RawPlugins>>
type _GeneratedAuthInternalApi = _CoreAuthInternalApi & _PluginAuthInternalApi

type _RoutePathToRequestPath<Path extends string> = Path extends \`\${infer Prefix}:\${string}/\${infer Rest}\`
  ? \`\${Prefix}\${string}/\${_RoutePathToRequestPath<Rest>}\`
  : Path extends \`\${infer Prefix}:\${string}\`
      ? \`\${Prefix}\${string}\`
      : Path
type _AuthApiPatternPath = Extract<keyof _GeneratedAuthInternalApi, string>
type _AuthApiRequestPath = _RoutePathToRequestPath<_AuthApiPatternPath>
type _AuthPatternFromRequestPath<Path extends string> = {
  [Pattern in _AuthApiPatternPath]: Path extends _RoutePathToRequestPath<Pattern> ? Pattern : never
}[_AuthApiPatternPath]
type _AuthEndpointMethod<Path extends _AuthApiRequestPath> = Extract<keyof _GeneratedAuthInternalApi[_AuthPatternFromRequestPath<Path>], string>

type _AuthFetchMethod<Path extends _AuthApiRequestPath> = Extract<Exclude<import('${nitroTypesPath}').NitroFetchOptions<Path>['method'], undefined>, string>
type _AuthFetchDefaultMethod<Path extends _AuthApiRequestPath> = 'get'
type _AuthFetchResolvedMethod<Path extends _AuthApiRequestPath, Method extends string> = Lowercase<Method> extends _AuthEndpointMethod<Path>
  ? Lowercase<Method>
  : never
type _AuthFetchResult<Path extends _AuthApiRequestPath, Method extends string> = _GeneratedAuthInternalApi[_AuthPatternFromRequestPath<Path>][_AuthFetchResolvedMethod<Path, Method>]

declare module '#nuxt-better-auth' {
  export type AuthApiInternalRoutes = _GeneratedAuthInternalApi
  export type AuthApiEndpointPatternPath = _AuthApiPatternPath
  export type AuthApiEndpointPath = _AuthApiRequestPath
  export type AuthApiEndpointMethod<Path extends AuthApiEndpointPath> = _AuthEndpointMethod<Path>
  export type AuthApiEndpointResponse<
    Path extends AuthApiEndpointPath,
    Method extends AuthApiEndpointMethod<Path> = AuthApiEndpointMethod<Path>,
  > = AuthApiInternalRoutes[_AuthPatternFromRequestPath<Path>][Method]
}

declare module 'nuxt/dist/app/composables/fetch' {
  export function useFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = undefined,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = DataT,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useFetch(request: string | import('vue').Ref<string> | (() => string), opts?: any): any

  export function useLazyFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = undefined,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: Omit<import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>, 'lazy'>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useLazyFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = DataT,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: Omit<import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>, 'lazy'>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useLazyFetch(request: string | import('vue').Ref<string> | (() => string), opts?: any): any
}

declare module 'nuxt/app' {
  export function useFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = undefined,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = DataT,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useFetch(request: string | import('vue').Ref<string> | (() => string), opts?: any): any

  export function useLazyFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = undefined,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: Omit<import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>, 'lazy'>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useLazyFetch<
    ErrorT = FetchError,
    Path extends import('#nuxt-better-auth').AuthApiEndpointPath = import('#nuxt-better-auth').AuthApiEndpointPath,
    Method extends _AuthFetchMethod<Path> = _AuthFetchDefaultMethod<Path>,
    _ResT = _AuthFetchResult<Path, Method>,
    DataT = _ResT,
    PickKeys extends import('nuxt/dist/app/composables/asyncData').KeysOf<DataT> = import('nuxt/dist/app/composables/asyncData').KeysOf<DataT>,
    DefaultT = DataT,
  >(request: import('vue').Ref<Path> | Path | (() => Path), opts?: Omit<import('nuxt/dist/app/composables/fetch').UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, Path, Method>, 'lazy'>): import('nuxt/dist/app/composables/asyncData').AsyncData<import('nuxt/dist/app/composables/asyncData').PickFrom<DataT, PickKeys> | DefaultT, ErrorT | undefined>
  export function useLazyFetch(request: string | import('vue').Ref<string> | (() => string), opts?: any): any
}
export {}
`,
  }, serverConfigTypeTemplateOptions)

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-nitro.d.ts',
    getContents: () => `
${routeRuleAugmentations}
export {}
`,
  }, { nitro: true, node: true })
}

interface RegisterSharedTypeTemplatesInput {
  runtimeTypesAugmentPath: string
  runtimeTypesPath: string
  clientConfigPath: string
  h3TypesPath: 'h3' | 'nitro/h3'
}

export function registerSharedTypeTemplates(input: RegisterSharedTypeTemplatesInput) {
  const nitroV3 = input.h3TypesPath === 'nitro/h3'
  addTypeTemplate({
    filename: 'types/nuxt-better-auth.d.ts',
    getContents: () => `
declare module '#nuxt-better-auth' {
  import type { ComputedRef, Ref } from 'vue'

  export interface AuthUser {
    id: string
    createdAt: Date
    updatedAt: Date
    email: string
    emailVerified: boolean
    name: string
    image?: string | null
  }

  export interface AuthSession {
    id: string
    createdAt: Date
    updatedAt: Date
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string | null
    userAgent?: string | null
  }

  export type ClientAuthSession = Omit<AuthSession, 'token'>

  export interface ServerAuthContext {
    runtimeConfig: Record<string, unknown>
    db: unknown
    requestOrigin?: string
  }

  export interface AuthSocialProviderRegistry {}
  export type AuthSocialProviderId = AuthSocialProviderRegistry extends { ids: infer T } ? Extract<T, string> : never

  export interface AuthUserUpdateInput {
    name?: string
    image?: string | null
  }

  export interface UserSessionComposable {
    user: Ref<AuthUser | null>
    session: Ref<ClientAuthSession | null>
    loggedIn: ComputedRef<boolean>
    ready: ComputedRef<boolean>
    fetchSession: (options?: { headers?: HeadersInit, force?: boolean }) => Promise<void>
    waitForSession: () => Promise<void>
    signOut: (options?: { onSuccess?: () => void | Promise<void> }) => Promise<void>
    updateUser: (updates: AuthUserUpdateInput) => Promise<void>
  }

  export type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] }

  export interface AppSession {
    user: AuthUser
    session: AuthSession
  }

  export interface RequireSessionOptions {
    user?: UserMatch<AuthUser>
    rule?: (ctx: { user: AuthUser, session: AuthSession }) => boolean | Promise<boolean>
  }

  export type { AuthMeta, AuthMode, AuthRouteRules, Auth, InferUser, InferSession } from '${input.runtimeTypesPath}'
}
`,
  }, { nuxt: true, nitro: true, node: true, shared: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-h3.d.ts',
    getContents: () => `
declare module '${nitroV3 ? 'srvx' : 'h3'}' {
  interface ${nitroV3 ? 'ServerRequestContext' : 'H3EventContext'} {
    requestSession?: import('${input.runtimeTypesAugmentPath}').AppSession | null
  }
}
export {}
`,
  }, { nuxt: true, nitro: true, node: true, shared: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-client.d.ts',
    getContents: () => `
import type createAppAuthClient from '${input.clientConfigPath}'
type _ClientUserUpdateInput = Omit<NonNullable<Parameters<ReturnType<typeof createAppAuthClient>['updateUser']>[0]>, 'fetchOptions'>
declare module '#nuxt-better-auth' {
  export type AppAuthClient = ReturnType<typeof createAppAuthClient>
  interface AuthUserUpdateInput extends _ClientUserUpdateInput {}
}
`,
  })
}
