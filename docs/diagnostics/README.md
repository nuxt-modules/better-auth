# Diagnostic pages

The docs config generates `content/6.errors/` before Nuxt Content loads. Docus serves these pages through the existing docs route and includes them in its sitemap. Generated files are ignored by Git.

When adding a code to `src/module/diagnostics.ts`, add the matching entry to `pages.ts`. Call the diagnostic with representative parameters for its example, then write the cause, a concrete fix example, verification steps, and a related guide. The build fails if a code has no complete entry or its example points to another code.

The catalog owns the error message, suggested fix, and permanent `/errors/nuxt-auth-...` URL. The generated pages use those values directly. Keep existing codes stable when changing wording.

Run `pnpm typecheck` and `pnpm exec vitest run test/diagnostic-docs.test.ts`, then `pnpm build:docs` to check the generated content. The page footer links back to the authored source here.
