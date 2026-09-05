import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  serverAuth: vi.fn(),
  useRuntimeConfig: vi.fn(),
}))

vi.mock('../src/runtime/server/internal/nitro-compat', () => ({
  defineEventHandler: (handler: unknown) => handler,
  useRuntimeConfig: mocks.useRuntimeConfig,
}))

vi.mock('../src/runtime/server/utils/auth', () => ({
  serverAuth: mocks.serverAuth,
}))

const handler = (await import('../src/runtime/server/api/_better-auth/config.get')).default as (event: unknown) => Promise<unknown>

describe('devtools auth config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.serverAuth.mockReturnValue({ options: {} })
    mocks.useRuntimeConfig.mockReturnValue({
      public: { auth: {} },
      auth: {},
    })
  })

  it('reports ignored hubSecondaryStorage: true as disabled', async () => {
    mocks.useRuntimeConfig.mockReturnValue({
      public: { auth: {} },
      auth: { hubSecondaryStorage: true },
    })

    const result = await handler({}) as { config: { module: { hubSecondaryStorage: unknown } } }

    expect(result.config.module.hubSecondaryStorage).toBe(false)
  })
})
