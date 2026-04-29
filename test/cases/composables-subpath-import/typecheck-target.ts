import { useAuthAsyncData, useAuthRequestFetch, useSignIn, useSignUp, useUserSession } from '@onmax/nuxt-better-auth/composables'

const auth = useUserSession()
auth.loggedIn.value satisfies boolean
auth.fetchSession({ force: true })

const signIn = useSignIn('email')
signIn.execute({ email: 'user@example.com', password: 'password' })

const signUp = useSignUp('email')
signUp.execute({ email: 'user@example.com', password: 'password', name: 'User' } as any)

const requestFetch = useAuthRequestFetch()
requestFetch('/api/auth/get-session')

void useAuthAsyncData('session-check', async () => await requestFetch('/api/auth/get-session'), { requireAuth: false })
