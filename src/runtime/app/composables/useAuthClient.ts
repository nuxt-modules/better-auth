import type { AppAuthClient } from '#nuxt-better-auth'
import createAppAuthClient from '#auth/client'
import { useRequestURL, useRuntimeConfig } from '#imports'
import { createVueSafeAuthProxy } from '../internal/vue-safe-auth-proxy'

interface RuntimeFlags { client: boolean, server: boolean }

let _client: AppAuthClient | null = null
let _clientFacade: AppAuthClient | null = null

export function getAuthRuntimeFlags(): RuntimeFlags {
  const globalFlags = (globalThis as { __NUXT_BETTER_AUTH_TEST_FLAGS__?: RuntimeFlags }).__NUXT_BETTER_AUTH_TEST_FLAGS__
  if (globalFlags)
    return globalFlags
  return { client: Boolean(import.meta.client), server: Boolean(import.meta.server) }
}

function getClient(baseURL: string): AppAuthClient {
  if (!_client)
    _client = createAppAuthClient(baseURL)
  return _client
}

function getClientFacade(client: AppAuthClient): AppAuthClient {
  if (!_clientFacade)
    _clientFacade = createVueSafeAuthProxy(client)
  return _clientFacade
}

export function useRawAuthClient(): AppAuthClient | null {
  const runtimeFlags = getAuthRuntimeFlags()
  if (!runtimeFlags.client)
    return null

  const runtimeConfig = useRuntimeConfig()
  const requestURL = useRequestURL()
  const configuredSiteUrl = runtimeConfig.public.siteUrl
  const siteUrl = typeof configuredSiteUrl === 'string' && configuredSiteUrl ? configuredSiteUrl : requestURL.origin
  return getClient(siteUrl)
}

export function useAuthClient(): AppAuthClient | null {
  const rawClient = useRawAuthClient()
  return rawClient ? getClientFacade(rawClient) : null
}
