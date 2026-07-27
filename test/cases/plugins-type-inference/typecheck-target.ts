import type { NitroRouteRules } from 'nitropack/types'
import type { AuthSession, AuthUser } from '#nuxt-better-auth'
import type { AuthSocialProviderId } from '../../../src/runtime/types'

declare const serverAuth: typeof import('../../../src/runtime/server/utils/auth').serverAuth

declare module '#nuxt-better-auth' {
  interface AuthUser {
    foo: string
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
