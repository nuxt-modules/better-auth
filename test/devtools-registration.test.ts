import type { Nuxt } from '@nuxt/schema'
import { describe, expect, it, vi } from 'vitest'
import { setupDevTools } from '../src/devtools'

function createHooks() {
  const callbacks = new Map<string, (value: unknown) => void>()
  return {
    hook: (name: string, callback: (value: unknown) => void) => callbacks.set(name, callback),
    callHook: (name: string, value: unknown) => callbacks.get(name)?.(value),
  }
}

describe('devtools registration', () => {
  it('registers the legacy Auth tab on DevTools 3', async () => {
    const hooks = createHooks()
    setupDevTools({ hook: hooks.hook } as unknown as Nuxt)
    await hooks.callHook('devtools:initialized', { version: '3.4.2', packagePath: '/devtools' })
    const tabs: unknown[] = []
    await hooks.callHook('devtools:customTabs', tabs)
    expect(tabs).toEqual([{
      category: 'server',
      name: 'better-auth',
      title: 'Auth',
      icon: 'simple-icons:betterauth',
      view: { type: 'iframe', src: '/__better-auth-devtools' },
    }])
  })

  it.each(['4.0.0-beta.4', '4.0.0'])('registers a native Auth dock without a legacy tab on DevTools %s', async (version) => {
    const hooks = createHooks()
    setupDevTools({ hook: hooks.hook } as unknown as Nuxt)
    await hooks.callHook('devtools:initialized', { version, packagePath: '/devtools' })
    // Nuxt collects legacy tabs before the Vite DevTools context is ready.
    const tabs: unknown[] = []
    await hooks.callHook('devtools:customTabs', tabs)
    expect(tabs).toEqual([])
    const register = vi.fn()
    await hooks.callHook('devtools:ready', { docks: { register } })
    expect(register).toHaveBeenCalledExactlyOnceWith({
      id: 'better-auth',
      title: 'Auth',
      icon: 'simple-icons:betterauth',
      type: 'iframe',
      url: '/__better-auth-devtools',
      groupId: 'nuxt',
      category: 'server',
    })
    await hooks.callHook('devtools:customTabs', tabs)
    expect(tabs).toEqual([])
  })
})
