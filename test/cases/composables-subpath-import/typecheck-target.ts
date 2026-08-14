import type { UseUserSessionStateReturn } from '@nuxtjs/better-auth/composables'
import { runWithSessionRefresh, useAuthAsyncData, useAuthClient, useAuthRequestFetch, useSignIn, useSignUp, useUserSession, useUserSessionState } from '@nuxtjs/better-auth/composables'

const auth = useUserSession()
auth.loggedIn.value satisfies boolean
auth.fetchSession({ force: true })

const authState = useUserSessionState()
authState satisfies UseUserSessionStateReturn
authState.loggedIn.value satisfies boolean
authState.fetchSession({ force: true })

const client = useAuthClient()
client?.signOut()

const signIn = useSignIn('email')
signIn.execute({ email: 'user@example.com', password: 'password' })

const signUp = useSignUp('email')
signUp.execute({ email: 'user@example.com', password: 'password', name: 'User' } as any)

const requestFetch = useAuthRequestFetch()
requestFetch('/api/auth/get-session')

void useAuthAsyncData('session-check', async () => await requestFetch('/api/auth/get-session'), { requireAuth: false })

runWithSessionRefresh(async () => ({ ok: true })).then(result => result.ok satisfies boolean)
