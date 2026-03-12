import type { Nuxt } from '@nuxt/schema'
import { existsSync } from 'node:fs'
import { getLayerDirectories } from '@nuxt/kit'
import { isAbsolute, join, relative } from 'pathe'

export type ModuleConfigKind = 'server' | 'client'

export interface ResolvedModuleConfigPath {
  file: string
  path: string
}

const DEFAULT_CONFIG_FILES = {
  server: 'server/auth.config',
  client: 'app/auth.config',
} satisfies Record<ModuleConfigKind, string>

const CONFIG_EXTENSIONS = ['.ts', '.js']

function stripConfigExtension(path: string): string {
  return path.replace(/\.(?:ts|js)$/, '')
}

function configExists(path: string): boolean {
  return CONFIG_EXTENSIONS.some(ext => existsSync(`${path}${ext}`))
}

function getProjectRoot(nuxt: Nuxt): string {
  return getLayerDirectories(nuxt)[0]!.root
}

function getDefaultConfigPath(nuxt: Nuxt, kind: ModuleConfigKind): string {
  const project = getLayerDirectories(nuxt)[0]!
  return kind === 'server'
    ? join(project.server, 'auth.config')
    : join(project.app, 'auth.config')
}

function getLayerDefaultConfigPath(nuxt: Nuxt, kind: ModuleConfigKind): string | undefined {
  for (const layer of getLayerDirectories(nuxt)) {
    const candidate = kind === 'server'
      ? join(layer.server, 'auth.config')
      : join(layer.app, 'auth.config')

    if (configExists(candidate))
      return candidate
  }
}

function getRelativeConfigFile(nuxt: Nuxt, path: string): string {
  return relative(getProjectRoot(nuxt), path)
}

export function resolveModuleConfigPath(nuxt: Nuxt, kind: ModuleConfigKind, file: string): ResolvedModuleConfigPath {
  if (isAbsolute(file)) {
    const path = stripConfigExtension(file)
    return { file, path }
  }

  const defaultFile = DEFAULT_CONFIG_FILES[kind]
  if (file === defaultFile) {
    const discoveredPath = getLayerDefaultConfigPath(nuxt, kind) ?? getDefaultConfigPath(nuxt, kind)
    return {
      file: getRelativeConfigFile(nuxt, discoveredPath),
      path: discoveredPath,
    }
  }

  const path = stripConfigExtension(join(getProjectRoot(nuxt), file))
  return { file, path }
}
