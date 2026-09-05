import type { UseUserSessionStateReturn } from '@nuxtjs/better-auth/composables'
import { useSignOut as autoUseSignOut } from '#imports'
import { runWithSessionRefresh, useAuthAsyncData, useAuthClient, useAuthRequestFetch, useSignIn, useSignOut, useSignUp, useUserSession, useUserSessionState } from '@nuxtjs/better-auth/composables'

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

const signOut = useSignOut()
autoUseSignOut satisfies typeof useSignOut
signOut.execute() satisfies Promise<void>
signOut.execute({ onSuccess: async () => {} }) satisfies Promise<void>
signOut.status.value satisfies 'idle' | 'pending' | 'success' | 'error'
signOut.error.value?.message satisfies string | undefined

const requestFetch = useAuthRequestFetch()
requestFetch('/api/auth/get-session')

void useAuthAsyncData('session-check', async () => await requestFetch('/api/auth/get-session'), { requireAuth: false })

runWithSessionRefresh(async () => ({ ok: true })).then(result => result.ok satisfies boolean)
