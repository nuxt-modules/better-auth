import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addServerHandler: vi.fn(),
}))

vi.mock('@nuxt/kit', () => ({
  addComponentsDir: vi.fn(),
  addImports: vi.fn(),
  addNitroPlugin: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler: mocks.addServerHandler,
  addServerImports: vi.fn(),
}))

const { registerServerRuntime } = await import('../src/module/hooks')

function registerRouteAccess(nitroMajor: number | undefined) {
  registerServerRuntime({ clientOnly: false, nitroMajor, resolve: path => path })
  return mocks.addServerHandler.mock.calls
    .map(([handler]) => handler)
    .find(handler => handler.handler === './runtime/server/middleware/route-access')
}

describe('route-access middleware registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes the middleware on /** for Nitro v3', () => {
    expect(registerRouteAccess(3)).toEqual({ middleware: true, route: '/**', handler: './runtime/server/middleware/route-access' })
  })

  it.each([2, undefined])('registers the middleware without a route for Nitro %s', (nitroMajor) => {
    expect(registerRouteAccess(nitroMajor)).toEqual({ middleware: true, handler: './runtime/server/middleware/route-access' })
  })
})
