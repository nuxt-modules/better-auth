import { account, challenges, identitys, loginSessions, persons, schema, session, user, verification } from '#auth/schema'

export default defineEventHandler(() => {
  return {
    hasUser: Boolean(schema?.user),
    hasNamedUser: Boolean(user),
    hasGeneratedUser: user === persons && schema.persons === persons,
    hasSession: Boolean(schema?.session),
    hasNamedSession: Boolean(session),
    hasGeneratedSession: session === loginSessions && schema.loginSessions === loginSessions,
    hasAccount: Boolean(schema?.account),
    hasNamedAccount: Boolean(account),
    hasGeneratedAccount: account === identitys && schema.identitys === identitys,
    hasVerification: Boolean(schema?.verification),
    hasGeneratedVerification: verification === challenges && schema.challenges === challenges,
  }
})
