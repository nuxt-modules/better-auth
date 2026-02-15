import { beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuthMock = vi.fn((options: unknown) => ({ options }))
const createServerAuthMock = vi.fn()
const customSessionMock = vi.fn((handler: unknown) => ({
  id: 'custom-session',
  __handler: handler,
}))

vi.mock('#auth/database', () => ({
  createDatabase: () => undefined,
  db: undefined,
}))

vi.mock('#auth/secondary-storage', () => ({
  createSecondaryStorage: () => undefined,
}))

vi.mock('#auth/server', () => ({
  default: (...args: unknown[]) => createServerAuthMock(...args),
}))

vi.mock('better-auth', () => ({
  betterAuth: (...args: unknown[]) => betterAuthMock(...args),
}))

vi.mock('better-auth/plugins/custom-session', () => ({
  customSession: (...args: unknown[]) => customSessionMock(...args),
}))

vi.mock('h3', () => ({
  getRequestHost: () => 'example.com',
  getRequestProtocol: () => 'https',
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    public: { siteUrl: 'https://example.com' },
    betterAuthSecret: 'x'.repeat(64),
  }),
}))

async function loadServerAuth() {
  vi.resetModules()
  const mod = await import('../src/runtime/server/utils/auth')
  return mod.serverAuth
}

describe('appSession.enrich', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createServerAuthMock.mockReset()
    betterAuthMock.mockClear()
    customSessionMock.mockClear()
    createServerAuthMock.mockReturnValue({})
  })

  it('injects custom-session plugin when appSession.enrich is configured', async () => {
    createServerAuthMock.mockReturnValue({
      plugins: [{ id: 'demo-plugin' }],
      appSession: {
        enrich: async () => ({ user: { role: 'admin' } }),
      },
    })

    const serverAuth = await loadServerAuth()
    serverAuth()

    expect(customSessionMock).toHaveBeenCalledTimes(1)
    expect(betterAuthMock).toHaveBeenCalledTimes(1)
    const options = betterAuthMock.mock.calls[0][0] as { plugins: Array<{ id: string, __handler?: (session: unknown, ctx: unknown) => Promise<unknown> }> }
    expect(options.plugins.map(p => p.id)).toEqual(['demo-plugin', 'custom-session'])

    const customSessionPlugin = options.plugins.find(p => p.id === 'custom-session')
    const enriched = await customSessionPlugin?.__handler?.(
      { user: { id: 'u1' }, session: { id: 's1' } },
      {},
    ) as { user: { id: string, role?: string }, session: { id: string } }

    expect(enriched.user).toEqual({ id: 'u1', role: 'admin' })
    expect(enriched.session).toEqual({ id: 's1' })
  })

  it('keeps default behavior when appSession.enrich is omitted', async () => {
    createServerAuthMock.mockReturnValue({
      plugins: [{ id: 'demo-plugin' }],
    })

    const serverAuth = await loadServerAuth()
    serverAuth()

    expect(customSessionMock).not.toHaveBeenCalled()
    const options = betterAuthMock.mock.calls[0][0] as { plugins: Array<{ id: string }> }
    expect(options.plugins.map(p => p.id)).toEqual(['demo-plugin'])
  })

  it('throws when appSession.enrich is combined with a manual custom-session plugin', async () => {
    createServerAuthMock.mockReturnValue({
      plugins: [{ id: 'custom-session' }],
      appSession: {
        enrich: async () => ({ user: { role: 'admin' } }),
      },
    })

    const serverAuth = await loadServerAuth()
    expect(() => serverAuth()).toThrow('appSession.enrich cannot be used with a manually configured custom-session plugin')
  })
})
