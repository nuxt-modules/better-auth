export interface NitroCompatibilityImports {
  h3: 'h3' | 'nitro/h3'
  runtime: 'nitro2' | 'nitro3'
  types: 'nitropack/types' | 'nitro/types'
}

export function resolveNitroCompatibilityImports(nuxtVersion: string): NitroCompatibilityImports {
  const major = Number.parseInt(nuxtVersion, 10)
  const nitroV3 = Number.isFinite(major) && major >= 5

  return {
    h3: nitroV3 ? 'nitro/h3' : 'h3',
    runtime: nitroV3 ? 'nitro3' : 'nitro2',
    types: nitroV3 ? 'nitro/types' : 'nitropack/types',
  }
}
