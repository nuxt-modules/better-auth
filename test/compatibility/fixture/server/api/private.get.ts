import { defineEventHandler } from '#better-auth/nitro-compat'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { email: user.email }
})
