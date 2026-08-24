import type { BetterAuthClientOptions } from 'better-auth/client'

type FetchOptions = NonNullable<BetterAuthClientOptions['fetchOptions']>
type FetchImplementation = NonNullable<FetchOptions['customFetchImpl']>
type FetchPlugin = NonNullable<FetchOptions['plugins']>[number]

export interface HydratedSessionBootstrap {
  session: unknown
  user: unknown
}

interface BootstrapState {
  payload?: HydratedSessionBootstrap
  requestId?: string
  status: 'idle' | 'armed' | 'superseded' | 'claimed' | 'closed'
}

const clientBootstrapState = new WeakMap<object, BootstrapState>()
let bootstrapRequestSequence = 0

export const sessionBootstrapQueryKey = '__nuxtBetterAuthSsrBootstrap'

export function createSessionBootstrapFetch(upstreamFetch: FetchImplementation) {
  const state: BootstrapState = { status: 'idle' }
  const claimedSignals = new WeakSet<object>()
  const claimedRequestMarker = Symbol('nuxt-better-auth-session-bootstrap')

  const plugin: FetchPlugin = {
    id: 'nuxt-better-auth-session-bootstrap',
    name: 'Nuxt Better Auth session bootstrap',
    version: '1.0.0',
    init(url, options) {
      const requestOptions = options ?? {}
      const isSessionRequest = url === '/get-session'
        && (requestOptions.method ?? 'GET').toUpperCase() === 'GET'
      const requestId = requestOptions.query?.[sessionBootstrapQueryKey]
      const isBootstrapRequest = isSessionRequest
        && state.requestId !== undefined
        && requestId === state.requestId

      if (isBootstrapRequest && (state.status === 'armed' || state.status === 'superseded')) {
        state.status = 'claimed'
        Object.defineProperty(requestOptions, claimedRequestMarker, {
          enumerable: true,
          value: true,
        })
        if (requestOptions.signal && typeof requestOptions.signal === 'object')
          claimedSignals.add(requestOptions.signal)
      }
      else if (isSessionRequest && state.status === 'armed') {
        state.status = 'superseded'
      }
      else if (isSessionRequest && state.status === 'idle') {
        state.status = 'closed'
      }

      return { url, options: requestOptions }
    },
  }

  const fetch: FetchImplementation = async (input, init) => {
    const isClaimedRequest = init
      && ((init as Record<PropertyKey, unknown>)[claimedRequestMarker] === true
        || Boolean(init.signal && claimedSignals.has(init.signal)))

    if (isClaimedRequest) {
      const payload = state.payload
      state.payload = undefined
      state.requestId = undefined
      state.status = 'closed'

      if (payload) {
        return new Response(JSON.stringify(payload), {
          headers: { 'content-type': 'application/json' },
        })
      }
    }

    return upstreamFetch(input, init)
  }

  return {
    fetch,
    plugin,
    register(client: object) {
      clientBootstrapState.set(client, state)
    },
  }
}

export function primeSessionBootstrap(client: object, payload: HydratedSessionBootstrap): string | null {
  const state = clientBootstrapState.get(client)
  if (!state || state.status === 'claimed' || state.status === 'closed' || state.status === 'superseded')
    return null

  if (state.status === 'idle') {
    state.payload = payload
    state.requestId = (++bootstrapRequestSequence).toString(36)
    state.status = 'armed'
  }
  return state.requestId ?? null
}
