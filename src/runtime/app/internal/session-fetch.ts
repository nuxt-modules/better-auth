import type { Ref } from 'vue'
import type { AppAuthClient, AuthSession, AuthUser, ClientAuthSession } from '#nuxt-better-auth'
import { parseJSON } from 'better-auth/client'
import { useRequestFetch, useRequestHeaders } from '#imports'
import { normalizeAuthActionError } from './auth-action-error'

interface SessionResponse { session: AuthSession & { token?: string }, user: AuthUser }

export function stripToken(session: AuthSession & { token?: string }): ClientAuthSession {
  const { token: _, ...safe } = session
  return safe
}

function isExpectedSignedOutSessionError(error: unknown): boolean {
  const normalizedError = normalizeAuthActionError(error)
  if (normalizedError.status === 401)
    return true
  return normalizedError.code === 'UNAUTHORIZED'
}

export async function fetchSessionServer(
  session: Ref<ClientAuthSession | null>,
  user: Ref<AuthUser | null>,
  authReady: Ref<boolean>,
  options: { headers?: HeadersInit, force?: boolean } = {},
): Promise<void> {
  try {
    const headers = options.headers || useRequestHeaders(['cookie'])
    const requestFetch = useRequestFetch()
    const data = await requestFetch<SessionResponse | null>('/api/auth/get-session', {
      headers,
      parseResponse: parseJSON,
      ...(options.force ? { query: { disableCookieCache: true } } : {}),
    })

    if (data?.session && data?.user) {
      session.value = stripToken(data.session)
      user.value = data.user
    }
    else {
      session.value = null
      user.value = null
    }
  }
  catch {
    session.value = null
    user.value = null
  }
  finally {
    if (!authReady.value)
      authReady.value = true
  }
}

export async function fetchSessionClient(
  client: AppAuthClient,
  session: Ref<ClientAuthSession | null>,
  user: Ref<AuthUser | null>,
  authReady: Ref<boolean>,
  options: { headers?: HeadersInit, force?: boolean } = {},
): Promise<void> {
  try {
    const headers = options.headers || useRequestHeaders(['cookie'])
    const fetchOptions = { ...(headers ? { headers } : {}), throw: false as const }
    const query = options.force ? { disableCookieCache: true } : undefined
    const result = await client.getSession({ query }, fetchOptions)
    const data = result.data as SessionResponse | null

    if (data?.session && data?.user) {
      session.value = stripToken(data.session)
      user.value = data.user
    }
    else {
      session.value = null
      user.value = null
    }
  }
  catch (error) {
    session.value = null
    user.value = null
    if (!isExpectedSignedOutSessionError(error))
      console.error('[nuxt-better-auth] Failed to fetch session:', error)
  }
  finally {
    if (!authReady.value)
      authReady.value = true
  }
}
