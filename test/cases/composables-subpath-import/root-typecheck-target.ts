import type { ClientAuthSession, ModuleOptions } from '@nuxtjs/better-auth'
import { defineClientAuth, defineServerAuth } from '@nuxtjs/better-auth'

declare const session: ClientAuthSession
const options: ModuleOptions = { clientOnly: true }

void (session.id satisfies string)
// @ts-expect-error Session tokens are server-only.
void session.token
void options
void defineClientAuth({})
void defineServerAuth({})
