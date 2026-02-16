import { schema } from '#auth/schema'

export default defineEventHandler(() => {
  return {
    hasUser: Boolean(schema?.user),
    hasVerification: Boolean(schema?.verification),
  }
})
