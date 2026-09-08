import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateTemplates: vi.fn(),
}))

vi.mock('@nuxt/kit', () => ({
  addComponentsDir: vi.fn(),
  addImportsDir: vi.fn(),
  addPlugin: vi.fn(),
  addServerHandler: vi.fn(),
  addServerImports: vi.fn(),
  addServerImportsDir: vi.fn(),
  addServerScanDir: vi.fn(),
  extendPages: vi.fn(),
  updateTemplates: mocks.updateTemplates,
}))

vi.mock('../src/devtools', () => ({
  setupDevTools: vi.fn(),
}))

const { registerTemplateHmrHook } = await import('../src/module/hooks')

describe('auth config template HMR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('regenerates runtime and type templates owned by the module', async () => {
    let watch: ((event: string, path: string) => Promise<void>) | undefined
    const nuxt = {
      hook: vi.fn((name: string, callback: typeof watch) => {
        if (name === 'builder:watch')
          watch = callback
      }),
    }

    registerTemplateHmrHook(nuxt as any)
    await watch?.('change', 'server/auth.config.ts')

    expect(mocks.updateTemplates).toHaveBeenCalledOnce()
    const filter = mocks.updateTemplates.mock.calls[0]?.[0]?.filter
    expect(filter({ filename: 'better-auth/server.config.ts' })).toBe(true)
    expect(filter({ filename: 'better-auth/schema.sqlite.mjs' })).toBe(true)
    expect(filter({ filename: 'types/nuxt-better-auth-client.d.ts' })).toBe(true)
    expect(filter({ filename: 'unrelated/template.mjs' })).toBe(false)
  })

  it('ignores unrelated file changes', async () => {
    let watch: ((event: string, path: string) => Promise<void>) | undefined
    const nuxt = {
      hook: vi.fn((name: string, callback: typeof watch) => {
        if (name === 'builder:watch')
          watch = callback
      }),
    }

    registerTemplateHmrHook(nuxt as any)
    await watch?.('change', 'app/pages/index.vue')

    expect(mocks.updateTemplates).not.toHaveBeenCalled()
  })
})
