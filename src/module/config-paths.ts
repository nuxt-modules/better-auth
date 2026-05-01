import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthModuleOptions } from '../runtime/config'
import { existsSync } from 'node:fs'
import { getLayerDirectories } from '@nuxt/kit'
import { isAbsolute, join, relative } from 'pathe'

export type ModuleConfigKind = 'server' | 'client'

export interface AuthConfigDescriptor {
  kind: ModuleConfigKind
  configuredFile: string
  file: string
  path: string
  declaringLayerRoot: string
  isDefault: boolean
  isExplicit: boolean
  exists: boolean
  shouldCreateDefaultFile: boolean
}

interface ResolveAuthConfigDescriptorDependencies {
  configExists?: (path: string) => boolean
}

const CONFIG_EXTENSIONS = ['.ts', '.js']
const CONFIG_EXTENSION_RE = /\.(?:ts|js)$/
const DEFAULT_CONFIG_FILES = {
  server: 'server/auth.config',
  client: 'app/auth.config',
} satisfies Record<ModuleConfigKind, string>
const OPTION_KEY_BY_KIND = {
  server: 'serverConfig',
  client: 'clientConfig',
} satisfies Record<ModuleConfigKind, keyof BetterAuthModuleOptions>

function stripConfigExtension(path: string): string {
  return path.replace(CONFIG_EXTENSION_RE, '')
}

function defaultConfigExists(path: string): boolean {
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

function getLayerDefaultConfigPath(
  nuxt: Nuxt,
  kind: ModuleConfigKind,
  configExists: (path: string) => boolean,
): { path: string, declaringLayerRoot: string } | undefined {
  for (const { directory } of getLayerDirectoriesWithConfigs(nuxt)) {
    const candidate = kind === 'server'
      ? join(directory.server, 'auth.config')
      : join(directory.app, 'auth.config')

    if (configExists(candidate)) {
      return {
        path: candidate,
        declaringLayerRoot: directory.root,
      }
    }
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

function getEffectiveModuleConfigFile(nuxt: Nuxt, kind: ModuleConfigKind): string {
  const optionKey = OPTION_KEY_BY_KIND[kind]
  const authOptions = (nuxt.options as { auth?: BetterAuthModuleOptions }).auth
  return authOptions?.[optionKey] ?? DEFAULT_CONFIG_FILES[kind]
}

export function resolveAuthConfigDescriptor(
  nuxt: Nuxt,
  kind: ModuleConfigKind,
  file = getEffectiveModuleConfigFile(nuxt, kind),
  dependencies: ResolveAuthConfigDescriptorDependencies = {},
): AuthConfigDescriptor {
  const configExists = dependencies.configExists ?? defaultConfigExists
  const configuredFile = stripConfigExtension(file)

  if (isAbsolute(configuredFile)) {
    const declaringLayerRoot = resolveDeclaringLayerRoot(nuxt, kind, configuredFile)
    const exists = configExists(configuredFile)

    return {
      kind,
      configuredFile,
      file: configuredFile,
      path: configuredFile,
      declaringLayerRoot,
      isDefault: false,
      isExplicit: true,
      exists,
      shouldCreateDefaultFile: false,
    }
  }

  if (configuredFile === DEFAULT_CONFIG_FILES[kind]) {
    const project = getProjectDirectory(nuxt)
    const discovered = getLayerDefaultConfigPath(nuxt, kind, configExists)
    const path = discovered?.path ?? getDefaultConfigPath(nuxt, kind)
    const declaringLayerRoot = discovered?.declaringLayerRoot ?? project.root
    const exists = configExists(path)

    return {
      kind,
      configuredFile,
      file: getRelativeConfigFile(nuxt, path),
      path,
      declaringLayerRoot,
      isDefault: true,
      isExplicit: false,
      exists,
      shouldCreateDefaultFile: !exists,
    }
  }

  const declaringLayerRoot = resolveDeclaringLayerRoot(nuxt, kind, configuredFile)
  const path = join(declaringLayerRoot, configuredFile)
  const exists = configExists(path)

  return {
    kind,
    configuredFile,
    file: getRelativeConfigFile(nuxt, path),
    path,
    declaringLayerRoot,
    isDefault: false,
    isExplicit: true,
    exists,
    shouldCreateDefaultFile: false,
  }
}

export function resolveAuthConfigDescriptors(
  nuxt: Nuxt,
  files: Partial<Record<ModuleConfigKind, string>> = {},
  dependencies: ResolveAuthConfigDescriptorDependencies = {},
): Record<ModuleConfigKind, AuthConfigDescriptor> {
  return {
    server: resolveAuthConfigDescriptor(nuxt, 'server', files.server, dependencies),
    client: resolveAuthConfigDescriptor(nuxt, 'client', files.client, dependencies),
  }
}
