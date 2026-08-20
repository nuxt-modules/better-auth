# `@nuxtjs/better-auth`

Nuxt module for [Better Auth](https://better-auth.com) with Nuxt-native route protection, SSR-safe session access, auto-imported helpers, and optional NuxtHub-backed schema generation.

## Who this is for

The same module release supports Nuxt 4 stable with Nitro 2 and [Nuxt 5 nightly with Nitro 3](https://github.com/nuxt-modules/better-auth/pull/87). Use it when you want the Nuxt-specific pieces handled for you:

- `useUserSession()` for reactive auth state
- `requireUserSession(event)` and related server helpers
- route protection through `routeRules` and `definePageMeta({ auth })`
- generated `server/auth.config.ts` and `app/auth.config.ts`
- optional NuxtHub database integration and schema generation

## Install the module

For the fastest path in a supported Nuxt app:

```bash
npx nuxi module add @nuxtjs/better-auth
```

Then create or confirm these files:

- `server/auth.config.ts`
- `app/auth.config.ts`
- `.env` with `NUXT_BETTER_AUTH_SECRET`

For the full setup flow, follow the [installation guide](https://better-auth.nuxt.dev/getting-started/installation).

## Choose your setup path

- Use [NuxtHub integration](https://better-auth.nuxt.dev/integrations/nuxthub) if you want the shortest path to database-backed auth.
- Use [custom database setup](https://better-auth.nuxt.dev/guides/custom-database) if you already have your own database stack.
- Use [external auth backend](https://better-auth.nuxt.dev/guides/external-auth-backend) if Better Auth runs in a separate service.
- Use [database-less mode](https://better-auth.nuxt.dev/guides/database-less-mode) for stateless or OAuth-first setups with clear tradeoffs.

## Documentation

The documentation site is at [better-auth.nuxt.dev](https://better-auth.nuxt.dev).

Recommended reading order:

1. [Quickstart](https://better-auth.nuxt.dev/getting-started)
2. [Installation](https://better-auth.nuxt.dev/getting-started/installation)
3. [Configuration](https://better-auth.nuxt.dev/getting-started/configuration)
4. [Client setup](https://better-auth.nuxt.dev/getting-started/client-setup)
5. [Route protection](https://better-auth.nuxt.dev/core-concepts/route-protection)

## Development

```bash
pnpm install
pnpm dev:docs
```

Useful commands:

- `pnpm dev` to run the playground
- `pnpm dev:docs` to run the docs site
- `pnpm lint` to lint the repo
- `pnpm test` to run the test suite
- `pnpm build:docs` to build the docs site

## License

[MIT](https://github.com/nuxt-modules/better-auth/blob/main/LICENSE)
