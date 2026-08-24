import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineClientAuth } from '../src/runtime/config'
import { createSessionBootstrapFetch, primeSessionBootstrap, sessionBootstrapQueryKey } from '../src/runtime/internal/session-bootstrap'

const managerKeys = [
  Symbol.for('better-auth:broadcast-channel'),
  Symbol.for('better-auth:focus-manager'),
  Symbol.for('better-auth:online-manager'),
]

function resetBetterAuthManagers() {
  for (const key of managerKeys)
    delete (globalThis as Record<symbol, unknown>)[key]
}

async function runRequest(
  bootstrap: ReturnType<typeof createSessionBootstrapFetch>,
  options: {
    logicalURL: string
    method?: string
    query?: Record<string, unknown>
    transportURL?: string
  },
) {
  const signal = new AbortController().signal
  const requestOptions = {
    method: options.method ?? 'GET',
    query: options.query,
    signal,
  } as any
  await bootstrap.plugin.init?.(options.logicalURL, requestOptions)
  const context = {
    ...requestOptions,
    body: undefined,
    headers: new Headers(),
    url: new URL(options.transportURL ?? `https://auth.example/api/auth${options.logicalURL}`),
  } as any
  return bootstrap.fetch(context.url, context)
}

describe('hydrated session bootstrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetBetterAuthManagers()
  })

  afterEach(() => {
    resetBetterAuthManagers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('skips the bootstrap network call after plugins transform the request and keeps refresh mounted', async () => {
    const windowTarget = new EventTarget()
    const documentTarget = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    vi.stubGlobal('window', windowTarget)
    vi.stubGlobal('document', documentTarget)
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('localStorage', { setItem: vi.fn() })

    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({
      user: { id: 'fresh-user' },
      session: { id: 'fresh-session' },
    }), { headers: { 'content-type': 'application/json' } }))
    const transformPlugin = {
      id: 'transform-session-request',
      name: 'Transform session request',
      version: '1.0.0',
      init(url: string, options: Record<string, any>) {
        if (url !== '/get-session')
          return { url, options }
        return {
          url: 'https://proxy.example/session',
          options,
        }
      },
    }
    const sessionSchemaPlugin = {
      id: 'session-schema',
      name: 'Session schema',
      version: '1.0.0',
      schema: {
        config: { baseURL: 'https://proxy.example' },
        schema: {
          '/session': {
            method: 'GET',
            query: z.object({ disableCookieCache: z.boolean().optional() }).optional(),
          },
        },
      },
    }
    const onRequest = vi.fn(async (context: Record<string, unknown>) => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return {
        ...context,
        method: 'POST',
        signal: new AbortController().signal,
      }
    })
    const onSuccess = vi.fn()
    const createClient = defineClientAuth({
      fetchOptions: {
        customFetchImpl: upstreamFetch,
        onRequest,
        onSuccess,
        plugins: [transformPlugin, sessionSchemaPlugin],
      },
    })
    const client = createClient('http://localhost:3000')
    const hydratedSession = {
      user: { id: 'hydrated-user' },
      session: { id: 'hydrated-session' },
    }

    const bootstrapRequestId = primeSessionBootstrap(client, hydratedSession)
    expect(bootstrapRequestId).not.toBeNull()
    client.hydrateSession(hydratedSession as Parameters<typeof client.hydrateSession>[0])

    const scope = effectScope()
    const clientSession = scope.run(() => client.useSession())!
    void clientSession.value.refetch({
      query: { [sessionBootstrapQueryKey]: bootstrapRequestId! } as never,
    })

    await vi.advanceTimersByTimeAsync(20)

    expect(clientSession.value.data).toMatchObject(hydratedSession)
    expect(upstreamFetch).not.toHaveBeenCalled()
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onSuccess).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(6000)
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(20)

    expect(upstreamFetch).toHaveBeenCalledOnce()
    expect(onRequest).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(clientSession.value.data).toMatchObject({
      user: { id: 'fresh-user' },
      session: { id: 'fresh-session' },
    })

    scope.stop()
    await vi.runOnlyPendingTimersAsync()
  })

  it('consumes only the tagged core session request', async () => {
    const upstreamFetch = vi.fn(async () => new Response('{}'))
    const bootstrap = createSessionBootstrapFetch(upstreamFetch)
    const client = {}
    bootstrap.register(client)

    const requestId = primeSessionBootstrap(client, { user: { id: 'user-1' }, session: { id: 'session-1' } })
    expect(requestId).not.toBeNull()
    expect(primeSessionBootstrap(client, { user: { id: 'stale-user' }, session: { id: 'stale-session' } })).toBe(requestId)

    await runRequest(bootstrap, { logicalURL: '/plugin/get-session' })
    const response = await runRequest(bootstrap, {
      logicalURL: '/get-session',
      query: { [sessionBootstrapQueryKey]: requestId },
    })
    await runRequest(bootstrap, { logicalURL: '/get-session' })

    expect(await response.json()).toEqual({ user: { id: 'user-1' }, session: { id: 'session-1' } })
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    expect(primeSessionBootstrap(client, { user: {}, session: {} })).toBeNull()
  })

  it('does not let a competing session request consume the hydrated response', async () => {
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({
      user: { id: 'fresh-user' },
      session: { id: 'fresh-session' },
    }), { headers: { 'content-type': 'application/json' } }))
    const bootstrap = createSessionBootstrapFetch(upstreamFetch)
    const client = {}
    bootstrap.register(client)
    const requestId = primeSessionBootstrap(client, {
      user: { id: 'hydrated-user' },
      session: { id: 'hydrated-session' },
    })

    const manualRequest = runRequest(bootstrap, { logicalURL: '/get-session' })
    const bootstrapRequest = runRequest(bootstrap, {
      logicalURL: '/get-session',
      query: { [sessionBootstrapQueryKey]: requestId },
    })
    const [manualResponse, bootstrapResponse] = await Promise.all([manualRequest, bootstrapRequest])

    expect(await manualResponse.json()).toMatchObject({ user: { id: 'fresh-user' } })
    expect(await bootstrapResponse.json()).toMatchObject({ user: { id: 'hydrated-user' } })
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })

  it('fails closed when the session request starts before bootstrap is armed', async () => {
    const upstreamFetch = vi.fn(async () => new Response('{}'))
    const bootstrap = createSessionBootstrapFetch(upstreamFetch)
    const client = {}
    bootstrap.register(client)

    await runRequest(bootstrap, { logicalURL: '/get-session' })

    expect(primeSessionBootstrap(client, { user: {}, session: {} })).toBeNull()
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })
})
