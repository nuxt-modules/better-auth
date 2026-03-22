import { existsSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'pathe'

const CONFIG_EXTENSIONS = ['.ts', '.mts', '.js', '.mjs', '.cts', '.cjs'] as const

function hasKnownConfigExtension(path: string): boolean {
  return CONFIG_EXTENSIONS.some(extension => path.endsWith(extension))
}

export interface ResolvedNitroAuthConfigPath {
  requestedPath: string
  resolvedPath: string | null
}

export function resolveNitroAuthConfigPath(rootDir: string, configPath: string): ResolvedNitroAuthConfigPath {
  const requestedPath = isAbsolute(configPath) ? configPath : resolve(rootDir, configPath)

  if (hasKnownConfigExtension(requestedPath)) {
    return {
      requestedPath,
      resolvedPath: existsSync(requestedPath) ? requestedPath : null,
    }
  }

  for (const extension of CONFIG_EXTENSIONS) {
    const candidate = `${requestedPath}${extension}`
    if (existsSync(candidate)) {
      return {
        requestedPath,
        resolvedPath: candidate,
      }
    }
  }

  return {
    requestedPath,
    resolvedPath: null,
  }
}

export function formatMissingNitroAuthConfigError(rootDir: string, configPath: string): string {
  const expectedPath = hasKnownConfigExtension(configPath) ? configPath : `${configPath}.ts`
  const displayPath = isAbsolute(expectedPath) ? relative(rootDir, expectedPath) : expectedPath
  return `[nuxt-better-auth] Missing ${displayPath} - export default defineServerAuth(...) from @onmax/nuxt-better-auth/nitro/config`
}
