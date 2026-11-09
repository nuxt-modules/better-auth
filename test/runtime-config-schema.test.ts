import type { Nuxt } from '@nuxt/schema'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { createRuntimeConfigSchema, registerRuntimeConfigSchema, supportsRuntimeConfigSchemas } from '../src/module/runtime-config-schema'

interface Schema {
  '~standard': {
    validate: (value: unknown) => { value?: unknown, issues?: unknown[] }
    jsonSchema: { output: (options: { target: string }) => Record<string, unknown> }
  }
}

function compile(schema: unknown) {
  const standard = (schema as Schema)['~standard']
  return {
    json: standard.jsonSchema.output({ target: 'draft-2020-12' }),
    empty: standard.validate(undefined),
  }
}

describe('runtime config schema', () => {
  it('detects Nuxt versions that compile runtime config schemas', () => {
    expect(supportsRuntimeConfigSchemas({ options: { _runtimeConfigSchemas: [] } } as unknown as Nuxt)).toBe(true)
    expect(supportsRuntimeConfigSchemas({ options: {} } as unknown as Nuxt)).toBe(false)
  })

  it('describes each value with JSON Schema that Nuxt can check at runtime', () => {
    const schema = createRuntimeConfigSchema(false)

    expect(compile(schema.betterAuthSecret).json).toMatchObject({ type: 'string', default: '' })
    expect(compile(schema.public.siteUrl).json).toMatchObject({ type: 'string', default: '' })
    expect(compile(schema.public.auth.preserveRedirect).json).toMatchObject({ type: 'boolean' })
    expect(compile(schema.public.auth.redirects.login).json).toMatchObject({ type: 'string' })
    for (const leaf of [schema.betterAuthSecret, schema.public.siteUrl, schema.public.auth.redirects.login])
      expect(JSON.stringify(compile(leaf).json)).not.toMatch(/format|pattern|minLength/)
  })

  it('defaults the secret and siteUrl to empty strings, and keeps optional redirects optional', () => {
    const schema = createRuntimeConfigSchema(false)

    expect(compile(schema.betterAuthSecret).empty).toEqual({ value: '' })
    expect(compile(schema.public.siteUrl).empty).toEqual({ value: '' })
    expect(compile(schema.public.auth.redirects.authenticated).empty).toEqual({ value: undefined })
    // Values without a default are always set by the module before the schema is registered.
    expect(compile(schema.public.auth.redirects.login).empty.issues).toBeDefined()
  })

  it('leaves the secret out of the client-only schema', () => {
    expect(createRuntimeConfigSchema(true)).not.toHaveProperty('betterAuthSecret')
  })
})

describe('registerRuntimeConfigSchema', () => {
  let root: string | undefined

  afterEach(() => {
    if (root)
      rmSync(root, { recursive: true, force: true })
    delete (globalThis as { __kitUpdates?: unknown }).__kitUpdates
  })

  it('uses the Kit that the app\'s Nuxt resolves', async () => {
    root = mkdtempSync(join(tmpdir(), 'better-auth-kit-'))
    const nuxtDir = join(root, 'node_modules/nuxt')
    const kitDir = join(nuxtDir, 'node_modules/@nuxt/kit')
    mkdirSync(kitDir, { recursive: true })
    writeFileSync(join(root, 'package.json'), '{"name":"app"}')
    writeFileSync(join(nuxtDir, 'package.json'), '{"name":"nuxt","version":"5.0.0"}')
    writeFileSync(join(kitDir, 'package.json'), '{"name":"@nuxt/kit","type":"module","exports":{".":{"import":"./index.mjs"}}}')
    writeFileSync(join(kitDir, 'index.mjs'), 'export function updateRuntimeConfig(update) { (globalThis.__kitUpdates ||= []).push(update) }')

    await registerRuntimeConfigSchema({ options: { rootDir: root } } as unknown as Nuxt, false)

    const updates = (globalThis as { __kitUpdates?: Record<string, any>[] }).__kitUpdates
    expect(updates).toHaveLength(1)
    expect(Object.keys(updates![0]!)).toEqual(['betterAuthSecret', 'public'])
    expect(updates![0]!.public.siteUrl['~standard'].vendor).toBe('zod')
  })
})
