import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveNitro3RouteRulesTarget } from '../src/module/compatibility'
import { registerServerTypeTemplates } from '../src/module/type-templates'

interface TypeTemplate {
  filename: string
  getContents: () => string
}

const mocks = vi.hoisted(() => ({
  templates: [] as TypeTemplate[],
  templateOptions: new Map<string, Record<string, boolean>>(),
}))

vi.mock('@nuxt/kit', () => ({
  addTypeTemplate(template: TypeTemplate, options: Record<string, boolean>) {
    mocks.templates.push(template)
    mocks.templateOptions.set(template.filename, options)
  },
}))

const tempDirs: string[] = []

afterEach(() => {
  mocks.templates.length = 0
  mocks.templateOptions.clear()
  for (const dir of tempDirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

function generatedTemplate(filename: string): string {
  const template = mocks.templates.find(template => template.filename === filename)
  expect(template, `${filename} was not registered`).toBeDefined()
  return template!.getContents()
}

describe('nitro 3 generated declarations', () => {
  it.each([false, true])('typechecks isolated Nitro dependencies with integration package: %s', (usesIntegration) => {
    const fixtureDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-nitro3-types-'))
    tempDirs.push(fixtureDir)

    function createPackage(name: string, exports: Record<string, string>, declarations: Record<string, string>) {
      const dir = join(fixtureDir, '.pnpm', name.replace('/', '+'), 'node_modules', name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', exports: { ...exports, './package.json': './package.json' } }))
      for (const [file, contents] of Object.entries(declarations)) {
        writeFileSync(join(dir, file), contents)
        writeFileSync(join(dir, file.replace('.d.mts', '.mjs')), '')
      }
      return dir
    }

    function linkDependency(owner: string, name: string, target: string) {
      const link = join(owner, 'node_modules', name)
      mkdirSync(dirname(link), { recursive: true })
      symlinkSync(target, link, 'dir')
    }

    const h3Dir = createPackage('h3', { './rules': './rules.mjs' }, {
      'rules.d.mts': `export interface RouteRuleConfig {}
export interface RouteRules {}
export type NormalizedRouteRules = { [K in keyof RouteRules]?: RouteRules[K] | false }`,
    })
    const nitroDir = createPackage('nitro', { './types': './types.mjs' }, {
      'types.d.mts': `export type NitroRouteConfig = import('h3/rules').RouteRuleConfig
export type NitroRouteRules = import('h3/rules').NormalizedRouteRules`,
    })
    const nuxtDir = createPackage('nuxt', { '.': './index.mjs' }, {
      'index.d.mts': `export type { NitroRouteConfig, NitroRouteRules } from '${usesIntegration ? '@nuxt/nitro-server' : 'nitro/types'}'`,
    })
    linkDependency(fixtureDir, 'nuxt', nuxtDir)
    linkDependency(nitroDir, 'h3', h3Dir)
    const consumerDir = join(fixtureDir, 'consumer')
    linkDependency(consumerDir, 'h3', h3Dir)
    writeFileSync(join(consumerDir, 'typecheck-target.ts'), `
import type { RouteRuleConfig, RouteRules } from 'h3/rules'
import type { AuthMeta } from '../auth-types'

const authoredRule = { auth: 'user' } satisfies RouteRuleConfig
declare const resolvedRule: RouteRules
const resolvedAuth: AuthMeta | undefined = resolvedRule.auth
// @ts-expect-error package-specifier imports retain the augmented auth contract
const invalidRule = { auth: 'invalid-role' } satisfies RouteRuleConfig

void authoredRule
void resolvedAuth
void invalidRule
`)
    if (usesIntegration) {
      const integrationDir = createPackage('@nuxt/nitro-server', { '.': './index.mjs' }, {
        'index.d.mts': `export type { NitroRouteConfig, NitroRouteRules } from 'nitro/types'`,
      })
      linkDependency(nuxtDir, '@nuxt/nitro-server', integrationDir)
      linkDependency(integrationDir, 'nitro', nitroDir)
    }
    else {
      linkDependency(nuxtDir, 'nitro', nitroDir)
    }
    const target = resolveNitro3RouteRulesTarget(fixtureDir)
    expect(target.moduleName).toBe(join(h3Dir, 'rules.mjs'))
    registerServerTypeTemplates({
      serverConfigPath: './auth.config',
      hasHubDb: false,
      runtimeTypesPath: './auth-types',
      sharedServerConfigSafe: false,
      h3TypesPath: 'nitro/h3',
      nitro3RouteRulesTarget: target,
    })

    const routeRulesDeclaration = generatedTemplate('types/nuxt-better-auth-nitro.d.ts')
    const endpointDeclaration = generatedTemplate('types/nuxt-better-auth-endpoints.d.ts')

    expect(mocks.templateOptions.get('types/nuxt-better-auth-nitro.d.ts')).toMatchObject({ nuxt: true, nitro: true, node: true })
    expect(routeRulesDeclaration).toContain(`declare module ${JSON.stringify(target.moduleName)}`)
    expect(routeRulesDeclaration).toContain('interface RouteRuleConfig')
    expect(routeRulesDeclaration).toContain('interface RouteRules')
    expect(routeRulesDeclaration).not.toContain('NitroRouteConfig')
    expect(routeRulesDeclaration).not.toContain('NitroRouteRules')
    expect(endpointDeclaration).not.toContain(`from 'nitro/types'`)

    writeFileSync(join(fixtureDir, 'auth-types.d.ts'), `export type AuthMeta = false | 'guest' | 'user' | { only?: 'guest' | 'user' }\n`)
    writeFileSync(join(fixtureDir, 'nuxt-better-auth-nitro.d.ts'), routeRulesDeclaration)
    writeFileSync(join(fixtureDir, 'typecheck-target.ts'), `
import type { NitroRouteConfig, NitroRouteRules } from 'nuxt'
import type { AuthMeta } from './auth-types'

const authoredRule = { auth: 'user' } satisfies NitroRouteConfig
declare const resolvedRule: NitroRouteRules
const resolvedAuth: AuthMeta | undefined = resolvedRule.auth

void authoredRule
void resolvedAuth
`)

    const projectRoot = dirname(import.meta.dirname)
    writeFileSync(join(fixtureDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        types: ['node'],
        typeRoots: [join(projectRoot, 'node_modules/@types')],
      },
      files: [
        './auth-types.d.ts',
        './nuxt-better-auth-nitro.d.ts',
        './typecheck-target.ts',
        './consumer/typecheck-target.ts',
      ],
    }, null, 2))

    const typecheck = spawnSync('pnpm', ['exec', 'tsc', '--project', join(fixtureDir, 'tsconfig.json'), '--pretty', 'false'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 120_000,
    })

    expect(typecheck.status, `strict declaration typecheck failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    expect(readFileSync(join(fixtureDir, 'tsconfig.json'), 'utf8')).toContain('"skipLibCheck": false')
  }, 180_000)

  it('keeps Nitro 2 route-rule augmentation and fetch helpers', () => {
    registerServerTypeTemplates({
      serverConfigPath: './auth.config',
      hasHubDb: false,
      runtimeTypesPath: './auth-types',
      sharedServerConfigSafe: false,
      h3TypesPath: 'h3',
    })

    const routeRulesDeclaration = generatedTemplate('types/nuxt-better-auth-nitro.d.ts')
    const endpointDeclaration = generatedTemplate('types/nuxt-better-auth-endpoints.d.ts')

    expect(routeRulesDeclaration).toContain(`declare module 'nitropack'`)
    expect(routeRulesDeclaration).toContain(`declare module 'nitropack/types'`)
    expect(routeRulesDeclaration).toContain('interface NitroRouteConfig')
    expect(routeRulesDeclaration).toContain('interface NitroRouteRules')
    expect(endpointDeclaration).toContain(`from 'nitropack/types'`)
  })
})
