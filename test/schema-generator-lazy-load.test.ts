import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('schema generator bundle', () => {
  it('loads Better Auth schema tooling only when schema generation runs', () => {
    const modulePath = fileURLToPath(new URL('../dist/module.mjs', import.meta.url))
    const moduleCode = readFileSync(modulePath, 'utf8')

    expect(moduleCode).not.toMatch(/from\s+["']auth\/api["']/)
    expect(moduleCode).toMatch(/import\(["']auth\/api["']\)/)
  })
})
