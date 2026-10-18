import type { NuxtConfig } from 'nuxt/schema'
import { defineEventHandler } from '#better-auth/nitro-compat'

const routeRules = { auth: 'guest' } satisfies NonNullable<NuxtConfig['routeRules']>[string]

export default defineEventHandler(event => ({
  guest: routeRules.auth === 'guest',
  session: event.context.requestSession ?? null,
}))
