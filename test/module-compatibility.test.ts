import { describe, expect, it } from 'vitest'
import { resolveNitroCompatibilityImports, selectNitro3RouteRulesTarget } from '../src/module/compatibility'

describe('nuxt Nitro compatibility imports', () => {
  it('uses Nitro 2 imports for Nuxt 4', () => {
    expect(resolveNitroCompatibilityImports('4.5.0')).toEqual({
      h3: 'h3',
      runtime: 'nitro2',
    })
  })

  it('uses Nitro 3 imports for Nuxt 5', () => {
    expect(resolveNitroCompatibilityImports('5.0.0-29745766.482f3357')).toEqual({
      h3: 'nitro/h3',
      runtime: 'nitro3',
    })
  })

  it('augments early Nitro 3 route-rule interfaces directly', () => {
    expect(selectNitro3RouteRulesTarget('interface NitroRouteConfig {}', () => 'unused')).toEqual({
      moduleName: 'nitro/types',
      configInterface: 'NitroRouteConfig',
      rulesInterface: 'NitroRouteRules',
    })
  })

  it('resolves the h3 module owned by newer Nitro 3 releases', () => {
    expect(selectNitro3RouteRulesTarget('type NitroRouteConfig = RouteRuleConfig', () => '/nested/h3/rules.mjs')).toEqual({
      moduleName: '/nested/h3/rules.mjs',
      configInterface: 'RouteRuleConfig',
      rulesInterface: 'RouteRules',
    })
  })
})
