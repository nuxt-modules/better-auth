import { readFile } from 'node:fs/promises'
import { resolve } from 'pathe'
import { describe, expect, it } from 'vitest'

describe('published runtime server tsconfig', () => {
  it('does not reference files omitted from the npm package or deprecated options', async () => {
    const config = JSON.parse(await readFile(resolve('src/runtime/server/tsconfig.json'), 'utf8'))

    expect(config).not.toHaveProperty('extends')
    expect(config.compilerOptions).not.toHaveProperty('baseUrl')
  })
})
