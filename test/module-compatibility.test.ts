import { describe, expect, it } from 'vitest'
import { resolveNitroCompatibilityImports } from '../src/module/compatibility'

describe('nuxt Nitro compatibility imports', () => {
  it('uses Nitro 2 imports for Nuxt 4', () => {
    expect(resolveNitroCompatibilityImports('4.5.0')).toEqual({
      h3: 'h3',
      runtime: 'nitro2',
      types: 'nitropack/types',
    })
  })

  it('uses Nitro 3 imports for Nuxt 5', () => {
    expect(resolveNitroCompatibilityImports('5.0.0-29745766.482f3357')).toEqual({
      h3: 'nitro/h3',
      runtime: 'nitro3',
      types: 'nitro/types',
    })
  })
})
