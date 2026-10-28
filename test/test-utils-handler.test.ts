import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { expect, it, vi } from 'vitest'
import handler from '../src/runtime/test-utils/server/handler'

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({ betterAuthTestToken: 'test-token' }),
}))

vi.mock('../src/runtime/server/utils/auth', () => ({
  serverAuth: () => ({
    $context: Promise.resolve({
      test: {
        createUser: (data: Record<string, unknown>) => ({ id: 'test-user', ...data }),
        saveUser: async (user: unknown) => user,
      },
    }),
  }),
}))

it('reads an authorized streamed body after checking the test token', async () => {
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify({ action: 'createUser', data: { name: 'Test viewer' } }))]), {
    method: 'POST',
    url: '/api/auth/__test__',
    headers: {
      'host': 'localhost:3000',
      'content-type': 'application/json',
      'x-nuxt-auth-test': 'test-token',
    },
  })

  await expect(handler({ node: { req } } as unknown as H3Event)).resolves.toEqual({ id: 'test-user', name: 'Test viewer' })
})
