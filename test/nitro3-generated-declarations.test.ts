import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  it('uses h3 route-rule extensions and typechecks them with library checks enabled', () => {
    registerServerTypeTemplates({
      serverConfigPath: './auth.config',
      hasHubDb: false,
      runtimeTypesPath: './auth-types',
      sharedServerConfigSafe: false,
      h3TypesPath: 'nitro/h3',
      nitro3RouteRulesTarget: {
        moduleName: 'h3/rules',
        configInterface: 'RouteRuleConfig',
        rulesInterface: 'RouteRules',
      },
    })

    const routeRulesDeclaration = generatedTemplate('types/nuxt-better-auth-nitro.d.ts')
    const endpointDeclaration = generatedTemplate('types/nuxt-better-auth-endpoints.d.ts')

    expect(mocks.templateOptions.get('types/nuxt-better-auth-nitro.d.ts')).toMatchObject({ nuxt: true, nitro: true, node: true })
    expect(routeRulesDeclaration).toContain(`declare module "h3/rules"`)
    expect(routeRulesDeclaration).toContain('interface RouteRuleConfig')
    expect(routeRulesDeclaration).toContain('interface RouteRules')
    expect(routeRulesDeclaration).not.toContain('NitroRouteConfig')
    expect(routeRulesDeclaration).not.toContain('NitroRouteRules')
    expect(endpointDeclaration).not.toContain(`from 'nitro/types'`)

    const fixtureDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-nitro3-types-'))
    tempDirs.push(fixtureDir)
    writeFileSync(join(fixtureDir, 'auth-types.d.ts'), `export type AuthMeta = false | 'guest' | 'user' | { only?: 'guest' | 'user' }\n`)
    // Model Nitro 3's h3 extension points and its compatibility aliases without loading unrelated provider declarations.
    writeFileSync(join(fixtureDir, 'h3-rules.d.ts'), `
declare module 'h3/rules' {
  export interface RouteRuleConfig {}
  export interface RouteRules {}
  export type NormalizedRouteRules = {
    [K in keyof RouteRules]?: RouteRules[K] | false
  }
}
`)
    writeFileSync(join(fixtureDir, 'nitro-types.d.ts'), `
declare module 'nitro/types' {
  export type NitroRouteConfig = import('h3/rules').RouteRuleConfig
  export type NitroRouteRules = import('h3/rules').NormalizedRouteRules
}
`)
    writeFileSync(join(fixtureDir, 'nuxt-better-auth-nitro.d.ts'), routeRulesDeclaration)
    writeFileSync(join(fixtureDir, 'typecheck-target.ts'), `
import type { NitroRouteConfig, NitroRouteRules } from 'nitro/types'
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
        './h3-rules.d.ts',
        './nitro-types.d.ts',
        './nuxt-better-auth-nitro.d.ts',
        './typecheck-target.ts',
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
