import type { AuthUser } from '#nuxt-better-auth'
import type { NitroRouteRules } from 'nitropack/types'

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
  internalCode: 'x',
  foo: 'bar',
}

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
