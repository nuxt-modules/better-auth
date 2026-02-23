import { schema } from '#auth/schema'

export default defineEventHandler(() => {
  return {
    hasUser: Boolean(schema?.user),
    hasAccount: Boolean(schema?.account),
    hasSession: Boolean(schema?.session),
    hasVerification: Boolean(schema?.verification),
  }
})
