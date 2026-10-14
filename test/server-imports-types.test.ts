import type { Nuxt } from '@nuxt/schema'
import type { ServerImportsTypesFile } from '../src/module/compatibility'
import { join } from 'pathe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerPrepareTypesHook } from '../src/module/hooks'
import { registerServerTypeTemplates } from '../src/module/type-templates'

interface TypeTemplate {
  filename: string
  getContents: () => string
}

const mocks = vi.hoisted(() => ({ templates: [] as TypeTemplate[] }))

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<typeof import('@nuxt/kit')>(),
  addTypeTemplate(template: TypeTemplate) {
    mocks.templates.push(template)
  },
}))

afterEach(() => {
  mocks.templates.length = 0
})

const buildDir = '/project/.nuxt'

async function prepareReferences(serverImportsTypesFile: ServerImportsTypesFile) {
  let prepareTypes: ((options: Record<string, unknown>) => void) | undefined
  const nuxt = {
    options: { buildDir, alias: {} },
    hook: (name: string, fn: typeof prepareTypes) => {
      if (name === 'prepare:types')
        prepareTypes = fn
    },
  } as unknown as Nuxt
  registerPrepareTypesHook({ nuxt, serverDir: '/project/server', hasHubDb: false, serverImportsTypesFile })

  const nodeReferences: { path: string }[] = []
  const sharedReferences: { path: string }[] = []
  prepareTypes!({ nodeTsConfig: {}, nodeReferences, sharedReferences })
  return { node: nodeReferences.map(r => r.path), shared: sharedReferences.map(r => r.path) }
}

function serverContextTemplate(serverImportsTypesFile: ServerImportsTypesFile) {
  registerServerTypeTemplates({
    serverConfigPath: './auth.config',
    hasHubDb: false,
    runtimeTypesPath: './auth-types',
    sharedServerConfigSafe: false,
    h3TypesPath: serverImportsTypesFile === 'server-imports.d.ts' ? 'nitro/h3' : 'h3',
    serverImportsTypesFile,
  })
  return mocks.templates.find(t => t.filename === 'types/nuxt-better-auth-server-context.d.ts')!.getContents()
}

// Nitro 3 (Nuxt 5) writes server auto-import declarations to server-imports.d.ts, so server/auth.config.ts
// lost every server util when the node program still referenced Nitro 2's nitro-imports.d.ts (#578).
describe.each([
  ['server-imports.d.ts', 'nitro-imports.d.ts'],
  ['nitro-imports.d.ts', 'server-imports.d.ts'],
] as const)('server auto-import types: %s', (expected, other) => {
  it('adds the declaration file to the node and shared programs', async () => {
    const references = await prepareReferences(expected)
    expect(references.node).toContain(join(buildDir, 'types', expected))
    expect(references.shared).toContain(join(buildDir, 'types', expected))
    expect([...references.node, ...references.shared]).not.toContain(join(buildDir, 'types', other))
  })

  it('references the declaration file from the server context template', () => {
    const contents = serverContextTemplate(expected)
    expect(contents).toContain(`/// <reference path="./${expected}" />`)
    expect(contents).not.toContain(other)
  })
})
