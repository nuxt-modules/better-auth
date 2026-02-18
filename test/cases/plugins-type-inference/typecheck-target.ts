import type { AuthUser } from '#nuxt-better-auth'
import type { NitroRouteRules } from 'nitropack/types'

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

void user
void rules
