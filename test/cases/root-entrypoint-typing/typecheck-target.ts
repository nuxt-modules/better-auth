import type { ModuleOptions } from '@nuxtjs/better-auth'
import authModule, { defineClientAuth, defineServerAuth } from '@nuxtjs/better-auth'

const options: ModuleOptions = {
  clientOnly: false,
}

const createClientAuth = defineClientAuth({})
const createServerAuth = defineServerAuth({
  emailAndPassword: { enabled: true },
})

void authModule
void options
void createClientAuth
void createServerAuth
