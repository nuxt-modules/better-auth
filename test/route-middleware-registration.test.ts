import { beforeEach, describe, expect, it, vi } from 'vitest'

const addRouteMiddleware = vi.hoisted(() => vi.fn())

vi.mock('@nuxt/kit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@nuxt/kit')>()
  return { ...original, addRouteMiddleware }
})

describe('auth route middleware registration', () => {
  beforeEach(() => {
    addRouteMiddleware.mockClear()
  })

  it('registers the global middleware through Nuxt Kit', async () => {
    const { registerAuthMiddleware } = await import('../src/module/hooks')
    const resolve = vi.fn((path: string) => `/module/${path}`)

    registerAuthMiddleware(resolve)

    expect(addRouteMiddleware).toHaveBeenCalledWith({
      name: 'auth',
      path: '/module/./runtime/app/middleware/auth.global',
      global: true,
    })
  })
})
