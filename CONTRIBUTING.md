# Contributing

Thanks for helping improve `@nuxtjs/better-auth`.

## Local setup

Use a supported Node.js version and enable the repository's pinned pnpm version:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Run the module playground with `pnpm dev`, or the documentation site with `pnpm dev:docs`.

## Before opening a pull request

Run the same core checks used by CI:

```bash
pnpm lint
pnpm typecheck
pnpm typecheck:runtime-server
pnpm typecheck:playground
pnpm prepack
pnpm test
pnpm dev:build
pnpm build:docs
```

The complete suite builds the package during test setup and can take several minutes. During development, run the narrowest relevant Vitest project first, for example:

```bash
pnpm vitest run test/get-request-session.test.ts --project unit
pnpm vitest run test/module.test.ts --project integration
```

Some integration fixtures update their local `.nuxtrc` setup version during a run. Do not include those generated changes unless your pull request intentionally changes the fixture.

## Pull requests

- Keep each pull request focused on one behavior or maintenance concern.
- Add a regression test for bug fixes and public contract changes.
- Update user documentation when behavior or configuration changes.
- Describe the user-visible impact and list the checks you ran.
- Do not commit secrets, generated `.nuxt` output, build artifacts, or local environment files.
