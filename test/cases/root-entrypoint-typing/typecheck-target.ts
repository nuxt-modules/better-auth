import type { ClientAuthSession, ModuleOptions } from '@nuxtjs/better-auth'
import authModule, { defineClientAuth, defineServerAuth } from '@nuxtjs/better-auth'

const options: ModuleOptions = {
  clientOnly: false,
}

const createClientAuth = defineClientAuth({})
const createServerAuth = defineServerAuth({
  emailAndPassword: { enabled: true },
})
declare const clientSession: ClientAuthSession

void authModule
void options
void createClientAuth
void createServerAuth
void clientSession.id
// @ts-expect-error Session tokens are server-only.
void clientSession.token
