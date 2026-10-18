import type { ActionHandleFor, UseAuthAsyncDataOptions, UserAuthActionHandle, UserAuthActionStatus, UseUserSessionStateReturn } from '@nuxtjs/better-auth/composables'
import { useSignOut as autoUseSignOut } from '#imports'
import { runWithSessionRefresh, useAction, useAuthAsyncData, useAuthClient, useAuthClientAction, useAuthRequestFetch, useSignIn, useSignOut, useSignUp, useUserSession, useUserSessionState } from '@nuxtjs/better-auth/composables'

type AsyncAction = (value: string) => Promise<number>

const actionOptions: UseAuthAsyncDataOptions<{ ok: boolean }> = { requireAuth: false }
void useAuthAsyncData('typed-options', async () => ({ ok: true }), actionOptions)
const action = useAction(async (value: string) => value.length)
action satisfies UserAuthActionHandle<[value: string], number>
action.status.value satisfies UserAuthActionStatus
action satisfies ActionHandleFor<AsyncAction>

const clientAction = useAuthClientAction(client => client.signOut)
clientAction.status.value satisfies UserAuthActionStatus

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
