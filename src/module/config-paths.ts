import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthModuleOptions } from '../runtime/config'
import { existsSync } from 'node:fs'
import { getLayerDirectories } from '@nuxt/kit'
import { isAbsolute, join, relative } from 'pathe'

export type ModuleConfigKind = 'server' | 'client'

export interface ResolvedModuleConfigPath {
  file: string
  path: string
  isDefault: boolean
}

const CONFIG_EXTENSIONS = ['.ts', '.js']
const DEFAULT_CONFIG_FILES = {
  server: 'server/auth.config',
  client: 'app/auth.config',
} satisfies Record<ModuleConfigKind, string>
const OPTION_KEY_BY_KIND = {
  server: 'serverConfig',
  client: 'clientConfig',
} satisfies Record<ModuleConfigKind, keyof BetterAuthModuleOptions>

function stripConfigExtension(path: string): string {
  return path.replace(/\.(?:ts|js)$/, '')
}

function configExists(path: string): boolean {
  return CONFIG_EXTENSIONS.some(ext => existsSync(`${path}${ext}`))
}

function getLayerDirectoriesWithConfigs(nuxt: Nuxt) {
  const directories = getLayerDirectories(nuxt)
  const layers = nuxt.options._layers as readonly { config?: { auth?: BetterAuthModuleOptions } }[]
  return directories.map((directory, index) => ({ directory, layer: layers[index] }))
}

function getProjectDirectory(nuxt: Nuxt) {
  return getLayerDirectories(nuxt)[0]!
}

function getDefaultConfigPath(nuxt: Nuxt, kind: ModuleConfigKind): string {
  const project = getProjectDirectory(nuxt)
  return kind === 'server'
    ? join(project.server, 'auth.config')
    : join(project.app, 'auth.config')
}

function getLayerDefaultConfigPath(nuxt: Nuxt, kind: ModuleConfigKind): string | undefined {
  for (const { directory } of getLayerDirectoriesWithConfigs(nuxt)) {
    const candidate = kind === 'server'
      ? join(directory.server, 'auth.config')
      : join(directory.app, 'auth.config')

    if (configExists(candidate))
      return candidate
  }
}

function resolveDeclaringLayerRoot(nuxt: Nuxt, kind: ModuleConfigKind, file: string): string {
  const optionKey = OPTION_KEY_BY_KIND[kind]

  for (const { directory, layer } of getLayerDirectoriesWithConfigs(nuxt)) {
    const declared = layer?.config?.auth?.[optionKey]
    if (typeof declared === 'string' && stripConfigExtension(declared) === file)
      return directory.root
  }

  return getProjectDirectory(nuxt).root
}

function getRelativeConfigFile(nuxt: Nuxt, path: string): string {
  return relative(getProjectDirectory(nuxt).root, path)
}

export function getEffectiveModuleConfigFile(nuxt: Nuxt, kind: ModuleConfigKind): string {
  const optionKey = OPTION_KEY_BY_KIND[kind]
  const authOptions = (nuxt.options as { auth?: BetterAuthModuleOptions }).auth
  return authOptions?.[optionKey] ?? DEFAULT_CONFIG_FILES[kind]
}

export function shouldCreateDefaultModuleConfig(nuxt: Nuxt, kind: ModuleConfigKind, file = getEffectiveModuleConfigFile(nuxt, kind)): boolean {
  const normalizedFile = stripConfigExtension(file)
  if (normalizedFile !== DEFAULT_CONFIG_FILES[kind])
    return false

  const resolved = resolveModuleConfigPath(nuxt, kind, normalizedFile)
  return !configExists(resolved.path)
}

export function resolveModuleConfigPath(nuxt: Nuxt, kind: ModuleConfigKind, file: string): ResolvedModuleConfigPath {
  const normalizedFile = stripConfigExtension(file)

  if (isAbsolute(normalizedFile)) {
    return {
      file: normalizedFile,
      path: normalizedFile,
      isDefault: false,
    }
  }

  if (normalizedFile === DEFAULT_CONFIG_FILES[kind]) {
    const discoveredPath = getLayerDefaultConfigPath(nuxt, kind) ?? getDefaultConfigPath(nuxt, kind)
    return {
      file: getRelativeConfigFile(nuxt, discoveredPath),
      path: discoveredPath,
      isDefault: true,
    }
  }

  const baseRoot = resolveDeclaringLayerRoot(nuxt, kind, normalizedFile)
  const path = join(baseRoot, normalizedFile)

  return {
    file: getRelativeConfigFile(nuxt, path),
    path,
    isDefault: false,
  }
}
