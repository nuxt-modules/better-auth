import type { NitroRouteRules } from 'nitropack/types'
import type { AuthSession, AuthUser, ClientAuthSession, UserSessionComposable } from '#nuxt-better-auth'
import type { AuthSocialProviderId } from '../../../src/runtime/types'

declare const serverAuth: typeof import('../../../src/runtime/server/utils/auth').serverAuth

declare module '#nuxt-better-auth' {
  interface AuthUser {
    foo: string
  }

  interface AuthSession {
    deviceLabel?: string
  }
}

const user: AuthUser = {
  id: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  email: 'a@b.c',
  emailVerified: false,
  name: 'n',
  role: 'admin',
  banned: false,
  banReason: null,
  banExpires: null,
  internalCode: 'x',
  foo: 'bar',
}

const session: AuthSession = {
  id: 'session-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: '1',
  expiresAt: new Date(),
  token: 'token',
}

const provider: AuthSocialProviderId = 'github'

const rules: NitroRouteRules = {
  auth: {
    user: { role: 'admin', internalCode: 'x', foo: 'bar' },
  },
}

const auth = serverAuth()
const signInUsername = auth.api.signInUsername

void user
void rules
void auth
void signInUsername
void session
void provider

// Server helpers retain the token, while client state omits it after sanitization.
const serverToken: string = session.token
const clientSession: ClientAuthSession = {
  id: 'session-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: '1',
  expiresAt: new Date(),
  deviceLabel: 'Laptop',
}
declare const composable: UserSessionComposable
composable.session.value = clientSession
// @ts-expect-error Tokens are removed from state before it reaches the client.
void composable.session.value?.token
// @ts-expect-error A client session cannot satisfy the full server session contract.
const fullSession: AuthSession = clientSession
void serverToken
void fullSession
