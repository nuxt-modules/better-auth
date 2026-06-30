import { account, schema, session, user } from '#auth/schema'

export default defineEventHandler(() => {
  return {
    hasUser: Boolean(schema?.user),
    hasNamedUser: Boolean(user),
    hasUsers: Boolean(schema?.users),
    hasSession: Boolean(schema?.session),
    hasNamedSession: Boolean(session),
    hasSessions: Boolean(schema?.sessions),
    hasAccount: Boolean(schema?.account),
    hasNamedAccount: Boolean(account),
    hasAccounts: Boolean(schema?.accounts),
    hasVerification: Boolean(schema?.verification),
  }
})
