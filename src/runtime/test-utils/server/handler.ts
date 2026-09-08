import type { TestHelpers } from 'better-auth/plugins'
import { parseJSON } from 'better-auth/client'
import { z } from 'zod'
import { createAuthError, defineEventHandler, toWebRequest, useRuntimeConfig } from '../../server/internal/nitro-compat'
import { serverAuth } from '../../server/utils/auth'

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('createUser'), data: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal('login'), data: z.object({ userId: z.string() }).passthrough() }),
  z.object({ action: z.literal('clear') }),
])
const ownedUsers = new Set<string>()

export default defineEventHandler(async (event) => {
  const token = useRuntimeConfig(event).betterAuthTestToken
  if (!token || toWebRequest(event).headers.get('x-nuxt-auth-test') !== token)
    throw createAuthError(404, 'Not found')

  const body = requestSchema.parse(parseJSON(await toWebRequest(event).text()))
  const context = await serverAuth(event).$context
  const test = (context as typeof context & { test: TestHelpers }).test

  if (body.action === 'createUser') {
    const user = await test.saveUser(test.createUser(body.data))
    ownedUsers.add(user.id)
    return user
  }

  if (body.action === 'login') {
    if (!ownedUsers.has(body.data.userId))
      throw createAuthError(403, 'Create the user through this test context before logging in.')
    const result = await test.login(body.data)
    return { ...result, headers: Array.from(result.headers.entries()) }
  }

  for (const id of ownedUsers) {
    await test.deleteUser(id)
    ownedUsers.delete(id)
  }
  return { ok: true }
})
