import { describe, expect, it, vi } from 'vitest'

let sessionMock: any

vi.mock('#imports', async () => {
  const vue = await import('vue')
  return {
    ref: vue.ref,
    computed: vue.computed,
    useUserSession: () => sessionMock,
  }
})

async function loadUseAuthClientAction() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useAuthClientAction')
  return mod.useAuthClientAction
}

describe('useAuthClientAction', () => {
  it('executes selected top-level client method', async () => {
    const checkout = vi.fn(async () => ({ ok: true }))
    sessionMock = {
      client: { checkout },
    }

    const useAuthClientAction = await loadUseAuthClientAction()
    const action = useAuthClientAction(client => client.checkout as any)

    await action.execute({ slug: 'pro' } as any)
    expect(checkout).toHaveBeenCalledWith({ slug: 'pro' })
    expect(action.status.value).toBe('success')
    expect(action.data.value).toEqual({ ok: true })
    expect(action.error.value).toBeNull()
  })

  it('executes selected nested client method', async () => {
    const portal = vi.fn(async () => ({ opened: true }))
    sessionMock = {
      client: { customer: { portal } },
    }

    const useAuthClientAction = await loadUseAuthClientAction()
    const action = useAuthClientAction(client => client.customer.portal as any)

    await action.execute()
    expect(portal).toHaveBeenCalledOnce()
    expect(action.status.value).toBe('success')
    expect(action.data.value).toEqual({ opened: true })
  })

  it('sets normalized error when client is unavailable', async () => {
    sessionMock = { client: null }

    const useAuthClientAction = await loadUseAuthClientAction()
    const action = useAuthClientAction(client => client.checkout as any)

    await expect(action.execute({ slug: 'pro' } as any)).resolves.toBeUndefined()
    expect(action.status.value).toBe('error')
    expect(action.error.value?.message).toBe('Auth client is unavailable. This action can only run on client-side.')
  })

  it('sets normalized error when selector does not resolve to a function', async () => {
    sessionMock = { client: { customer: {} } }

    const useAuthClientAction = await loadUseAuthClientAction()
    const action = useAuthClientAction(client => (client as any).customer.portal)

    await expect(action.execute()).resolves.toBeUndefined()
    expect(action.status.value).toBe('error')
    expect(action.error.value?.raw).toBeInstanceOf(TypeError)
    expect(action.error.value?.message).toBe('useAuthClientAction(select) must resolve to a function')
  })
})
