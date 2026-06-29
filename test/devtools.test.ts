import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addServerHandler: vi.fn(),
  extendPages: vi.fn(),
  hasNuxtModule: vi.fn(),
  installModule: vi.fn(),
  setupDevTools: vi.fn(),
}))

vi.mock('@nuxt/kit', () => ({
  addComponentsDir: vi.fn(),
  addImportsDir: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler: mocks.addServerHandler,
  addServerImports: vi.fn(),
  addServerImportsDir: vi.fn(),
  addServerScanDir: vi.fn(),
  extendPages: mocks.extendPages,
  hasNuxtModule: mocks.hasNuxtModule,
  installModule: mocks.installModule,
  updateTemplates: vi.fn(),
}))

vi.mock('../src/devtools', () => ({
  setupDevTools: mocks.setupDevTools,
}))

const { registerDevtools } = await import('../src/module/hooks')

describe('devtools registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not install host UI modules for the devtools page', async () => {
    const pages: unknown[] = []
    mocks.extendPages.mockImplementation((callback: (pages: unknown[]) => void) => callback(pages))

    await registerDevtools({
      nuxt: { options: { dev: true } } as any,
      clientOnly: false,
      hasHubDb: false,
      resolve: path => path,
    })

    expect(mocks.hasNuxtModule).not.toHaveBeenCalled()
    expect(mocks.installModule).not.toHaveBeenCalled()
    expect(mocks.setupDevTools).toHaveBeenCalledOnce()
    expect(mocks.addServerHandler).toHaveBeenCalledWith({ route: '/api/_better-auth/config', method: 'get', handler: './runtime/server/api/_better-auth/config.get' })
    expect(pages).toEqual([
      {
        name: 'better-auth-devtools',
        path: '/__better-auth-devtools',
        file: './runtime/app/pages/__better-auth-devtools.vue',
        meta: { layout: false },
      },
    ])
  })
})
