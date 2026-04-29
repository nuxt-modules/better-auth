---
title: Nuxt Better Auth
description: Seamless Better Auth integration for Nuxt with automatic route protection, session management, and role-based access control.
navigation: false
---

Nuxt Better Auth is a Nuxt 4 module that wraps [Better Auth](https://www.better-auth.com/) with Nuxt-native configuration, route protection, SSR-safe session access, and optional NuxtHub schema generation.

## Start here

Use the docs in this order if you are setting up the module for the first time:

1. [Quickstart](/getting-started)
2. [Installation](/getting-started/installation)
3. [Configuration](/getting-started/configuration)
4. [Client setup](/getting-started/client-setup)
5. [Route protection](/core-concepts/route-protection)

You should finish that path with a working `/api/auth/*` backend, a client config, and a login flow that can read session state through `useUserSession()`.

## Choose the right setup

| If you want to... | Start here |
| --- | --- |
| Get a database-backed setup running quickly | [NuxtHub](/integrations/nuxthub) |
| Plug Better Auth into your own database stack | [Custom database](/guides/custom-database) |
| Reuse an external Better Auth server | [External auth backend](/guides/external-auth-backend) |
| Avoid a database and accept stateless session tradeoffs | [Database-less mode](/guides/database-less-mode) |
| Migrate from `nuxt-auth-utils` | [Migration guide](/guides/migrate-from-nuxt-auth-utils) |

## What the module adds on top of Better Auth

- `server/auth.config.ts` and `app/auth.config.ts` helpers
- auto-imported client and server auth utilities
- route protection through `routeRules` and page meta
- SSR-aware session hydration
- typed `AuthUser` and `AuthSession` inference from your config
- optional NuxtHub database and schema integration

## Documentation map

### Getting started

- [Quickstart](/getting-started)
- [Installation](/getting-started/installation)
- [Configuration](/getting-started/configuration)
- [Client setup](/getting-started/client-setup)
- [Type augmentation](/getting-started/type-augmentation)
- [Schema generation](/getting-started/schema-generation)

### Core concepts

- [Server auth](/core-concepts/server-auth)
- [Sessions](/core-concepts/sessions)
- [Route protection](/core-concepts/route-protection)
- [Auto-imports and aliases](/core-concepts/auto-imports-aliases)
- [Security and caveats](/core-concepts/security-caveats)

### Guides and integrations

- [Role-based access](/guides/role-based-access)
- [OAuth providers](/guides/oauth-providers)
- [Two-factor authentication](/guides/two-factor-auth)
- [Production deployment](/guides/production-deployment)
- [NuxtHub](/integrations/nuxthub)
- [i18n](/integrations/i18n)

### API reference

- [Composables](/api/composables)
- [Server utilities](/api/server-utils)
- [Components](/api/components)
- [Types](/api/types)
