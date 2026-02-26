import { addTypeTemplate } from '@nuxt/kit'

interface RegisterServerTypeTemplatesInput {
  serverConfigPath: string
  hasHubDb: boolean
  runtimeTypesPath: string
}

export function registerServerTypeTemplates(input: RegisterServerTypeTemplatesInput): void {
  const { serverConfigPath, hasHubDb, runtimeTypesPath } = input

  addTypeTemplate({
    filename: 'types/auth-secondary-storage.d.ts',
    getContents: () => `
declare module '#auth/secondary-storage' {
  interface SecondaryStorage {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: unknown, ttl?: number) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  export function createSecondaryStorage(): SecondaryStorage | undefined
}
`,
  }, { nitro: true, node: true })

  addTypeTemplate({
    filename: 'types/auth-database.d.ts',
    getContents: () => `
declare module '#auth/database' {
  import type { BetterAuthOptions } from 'better-auth'
  export function createDatabase(): BetterAuthOptions['database']
  export const db: ${hasHubDb ? `typeof import('@nuxthub/db')['db']` : 'undefined'}
}
`,
  }, { nitro: true, node: true })

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
  }, { nitro: true, node: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-infer.d.ts',
    getContents: () => `
import type { BetterAuthOptions, BetterAuthPlugin, InferPluginTypes, UnionToIntersection } from 'better-auth'
import type { InferFieldsOutput } from 'better-auth/db'
import type { RuntimeConfig } from 'nuxt/schema'
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

type _UserFallback = _InferModelFieldsFromPlugins<_RawPlugins, 'user'> & _InferModelFieldsFromOptions<_RawConfig, 'user'>
type _SessionFallback = _InferModelFieldsFromPlugins<_RawPlugins, 'session'> & _InferModelFieldsFromOptions<_RawConfig, 'session'>

declare module '#nuxt-better-auth' {
  interface AuthUser extends _UserFallback {}
  interface AuthSession extends _SessionFallback {}
  interface ServerAuthContext {
    runtimeConfig: RuntimeConfig
    db: ${hasHubDb ? `typeof import('@nuxthub/db')['db']` : 'undefined'}
  }
  type PluginTypes = InferPluginTypes<_Config>
}

interface _AugmentedServerAuthContext {
  runtimeConfig: RuntimeConfig
  db: ${hasHubDb ? `typeof import('@nuxthub/db')['db']` : 'undefined'}
}

declare module '@onmax/nuxt-better-auth/config' {
  import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'
  type ServerAuthConfig = Omit<BetterAuthOptions, 'secret' | 'baseURL'> & {
    plugins?: readonly BetterAuthPlugin[]
  }
  export function defineServerAuth<const R>(config: (ctx: _AugmentedServerAuthContext) => R & ServerAuthConfig): (ctx: _AugmentedServerAuthContext) => R
  export function defineServerAuth<const R>(config: R & ServerAuthConfig): (ctx: _AugmentedServerAuthContext) => R
}
`,
  }, { nuxt: true, nitro: true, node: true })

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
  }, { nuxt: true, nitro: true, node: true })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-nitro.d.ts',
    getContents: () => `
import type createServerAuth from '${serverConfigPath}'
import type { BetterAuthOptions } from 'better-auth'
import type { getEndpoints } from 'better-auth/api'
import type { Serialize, Simplify } from 'nitropack/types'

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
type _UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never

type _CoreAuthInternalApi = {
  [K in keyof _AuthApi as _RoutePathFromEndpoint<_AuthApi[K]>]: {
    [M in _RouteMethodFromEndpoint<_AuthApi[K]> | 'default']: _RouteResponseFromEndpoint<_AuthApi[K]>
  }
}
type _PluginEndpointMaps<Plugins> = Plugins extends readonly (infer Plugin)[]
  ? Plugin extends { endpoints: infer Endpoints extends Record<string, unknown> }
      ? {
          [K in keyof Endpoints as _RoutePathFromEndpoint<Endpoints[K]>]: {
            [M in _RouteMethodFromEndpoint<Endpoints[K]> | 'default']: _RouteResponseFromEndpoint<Endpoints[K]>
          }
        }
      : {}
  : Plugins extends (infer Plugin)[]
      ? Plugin extends { endpoints: infer Endpoints extends Record<string, unknown> }
          ? {
              [K in keyof Endpoints as _RoutePathFromEndpoint<Endpoints[K]>]: {
                [M in _RouteMethodFromEndpoint<Endpoints[K]> | 'default']: _RouteResponseFromEndpoint<Endpoints[K]>
              }
            }
          : {}
      : {}
type _PluginAuthInternalApi = _UnionToIntersection<_PluginEndpointMaps<_RawPlugins>>
type _GeneratedAuthInternalApi = _CoreAuthInternalApi & _PluginAuthInternalApi

declare module '#nuxt-better-auth' {
  export type AuthApiInternalRoutes = _GeneratedAuthInternalApi
  export type AuthApiEndpointPath = Extract<keyof AuthApiInternalRoutes, string>
  export type AuthApiEndpointMethod<Path extends AuthApiEndpointPath> = Extract<keyof AuthApiInternalRoutes[Path], string>
  export type AuthApiEndpointResponse<
    Path extends AuthApiEndpointPath,
    Method extends AuthApiEndpointMethod<Path> = AuthApiEndpointMethod<Path>,
  > = AuthApiInternalRoutes[Path][Method]
}

declare module 'nitropack' {
  interface NitroRouteRules {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
  interface NitroRouteConfig {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
  interface InternalApi extends _GeneratedAuthInternalApi {}
}
declare module 'nitropack/types' {
  interface NitroRouteRules {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
  interface NitroRouteConfig {
    auth?: import('${runtimeTypesPath}').AuthMeta
  }
  interface InternalApi extends _GeneratedAuthInternalApi {}
}
export {}
`,
  }, { nuxt: true, nitro: true, node: true })
}

interface RegisterSharedTypeTemplatesInput {
  runtimeTypesAugmentPath: string
  runtimeTypesPath: string
  clientConfigPath: string
}

export function registerSharedTypeTemplates(input: RegisterSharedTypeTemplatesInput): void {
  addTypeTemplate({
    filename: 'types/nuxt-better-auth.d.ts',
    getContents: () => `
import type { AppSession } from '${input.runtimeTypesAugmentPath}'
export * from '${input.runtimeTypesAugmentPath}'
export type { AuthMeta, AuthMode, AuthRouteRules, AuthSocialProviderId, Auth, InferUser, InferSession } from '${input.runtimeTypesPath}'
declare module 'h3' {
  interface H3EventContext {
    requestSession?: AppSession | null
  }
}
`,
  })

  addTypeTemplate({
    filename: 'types/nuxt-better-auth-client.d.ts',
    getContents: () => `
import type createAppAuthClient from '${input.clientConfigPath}'
declare module '#nuxt-better-auth' {
  export type AppAuthClient = ReturnType<typeof createAppAuthClient>
}
`,
  })
}
