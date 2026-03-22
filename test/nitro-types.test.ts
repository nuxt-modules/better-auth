import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

describe('nitro type surface', () => {
  it('typechecks Nitro config augmentation and defineServerAuth', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-nitro-types-'))

    try {
      mkdirSync(join(testDir, 'nitro', 'runtime', 'server', 'internal'), { recursive: true })

      copyFileSync(join(import.meta.dirname, '../src/nitro/config.ts'), join(testDir, 'nitro', 'config.ts'))
      copyFileSync(join(import.meta.dirname, '../src/nitro/augment.ts'), join(testDir, 'nitro', 'augment.ts'))
      copyFileSync(join(import.meta.dirname, '../src/nitro/module-types.ts'), join(testDir, 'nitro', 'module-types.ts'))
      copyFileSync(join(import.meta.dirname, '../src/nitro/runtime/types.ts'), join(testDir, 'nitro', 'runtime', 'types.ts'))
      symlinkSync(join(import.meta.dirname, '../node_modules'), join(testDir, 'node_modules'), 'dir')

      writeFileSync(join(testDir, 'check.ts'), `import type { NitroConfig } from 'nitro/types'
import { defineServerAuth } from './nitro/config'

const authConfig = defineServerAuth(({ runtimeConfig }) => ({
  appName: String(runtimeConfig.appName ?? 'test'),
}))

const nitroConfig: NitroConfig = {
  betterAuth: {
    config: 'server/auth.config',
  },
  routeRules: {
    '/api/protected': {
      auth: 'user',
    },
    '/api/guest': {
      auth: {
        only: 'guest',
      },
    },
  },
}

void authConfig({ runtimeConfig: nitroConfig.runtimeConfig ?? {} })
`)

      writeFileSync(join(testDir, 'tsconfig.json'), `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "files": [
    "./nitro/config.ts",
    "./nitro/augment.ts",
    "./nitro/module-types.ts",
    "./nitro/runtime/types.ts",
    "./check.ts"
  ]
}
`)

      const typecheck = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', join(testDir, 'tsconfig.json')], {
        cwd: import.meta.dirname,
        encoding: 'utf8',
      })

      expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  }, 30_000)
})
