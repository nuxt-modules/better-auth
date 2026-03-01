<p align="center">
  <img src="https://raw.githubusercontent.com/onmax/nuxt-better-auth/main/.github/og.png" alt="Nuxt Better Auth" width="100%">
  <br>
  <sub>Designed by <a href="https://github.com/HugoRCD">HugoRCD</a></sub>
</p>

<h1 align="center">@onmax/nuxt-better-auth</h1>

<p align="center">Nuxt module for <a href="https://better-auth.com">Better Auth</a></p>

<p align="center">
  <a href="https://npmjs.com/package/@onmax/nuxt-better-auth"><img src="https://img.shields.io/npm/v/@onmax/nuxt-better-auth/latest.svg?style=flat&colorA=020420&colorB=00DC82" alt="npm version"></a>
  <a href="https://npm.chart.dev/@onmax/nuxt-better-auth"><img src="https://img.shields.io/npm/dm/@onmax/nuxt-better-auth.svg?style=flat&colorA=020420&colorB=00DC82" alt="npm downloads"></a>
  <a href="https://npmjs.com/package/@onmax/nuxt-better-auth"><img src="https://img.shields.io/npm/l/@onmax/nuxt-better-auth.svg?style=flat&colorA=020420&colorB=00DC82" alt="License"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js" alt="Nuxt"></a>
</p>

> [!WARNING]
> This library is a work in progress and not ready for production use.

## Documentation

**[better-auth.nuxt.dev](https://better-auth.nuxt.dev/)**

## Quick Start

1. Install module and NuxtHub (optional, for DB-backed sessions):

```bash
npx nuxi module add @onmax/nuxt-better-auth@alpha @nuxthub/core
```

2. Add minimal config:

```ts
export default defineNuxtConfig({
  hub: { db: 'sqlite' },
})
```

3. Set secret:

```ini
BETTER_AUTH_SECRET="generate-a-32-char-secret"
```

4. Create config files:
- `server/auth.config.ts` with `defineServerAuth(...)`
- `app/auth.config.ts` with `defineClientAuth(...)`

5. Run app:

```bash
pnpm dev
```

## Recommended Reading Order

1. [Installation](https://better-auth.nuxt.dev/getting-started/installation)
2. [Configuration](https://better-auth.nuxt.dev/getting-started/configuration)
3. [Client Setup](https://better-auth.nuxt.dev/getting-started/client-setup)
4. [Route Protection](https://better-auth.nuxt.dev/core-concepts/route-protection)
5. [Examples](https://better-auth.nuxt.dev/examples)

## License

MIT
