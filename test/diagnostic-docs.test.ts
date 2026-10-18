import { mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { generateDiagnosticPages, renderDiagnosticPages } from '../docs/diagnostics/generate'
import { diagnosticPages } from '../docs/diagnostics/pages'
import { diagnostics } from '../src/module/diagnostics'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('diagnostic documentation', () => {
  it('provides a searchable page and index link for every diagnostic URL', () => {
    const files = renderDiagnosticPages()
    const index = files.get('0.index.md')!

    expect(Object.keys(diagnosticPages).sort()).toEqual(Object.keys(diagnostics).sort())
    for (const [code, page] of Object.entries(diagnosticPages)) {
      const path = new URL(page.example.docs!).pathname
      const markdown = files.get(`${path.split('/').pop()}.md`)!
      expect(markdown, code).toBeDefined()
      const frontmatter = parse(markdown.split('---')[1])
      expect(frontmatter.title).toContain(code)
      expect(frontmatter.description).toBe(page.description)
      expect(frontmatter.editPath).toBe('diagnostics/pages.ts')
      expect(markdown).toContain(page.example.message)
      expect(markdown).toContain(page.example.fix)
      expect(markdown).toContain(page.solution)
      expect(index).toContain(`](${path})`)
    }
  })

  it('fails the build when a code has no authored documentation', () => {
    expect(() => renderDiagnosticPages({})).toThrow('Missing or incomplete diagnostic documentation: NUXT_AUTH_MISSING_CONFIG')
  })

  it('rejects examples for the wrong diagnostic', () => {
    expect(() => renderDiagnosticPages({
      ...diagnosticPages,
      NUXT_AUTH_MISSING_CONFIG: {
        ...diagnosticPages.NUXT_AUTH_MISSING_CONFIG,
        example: diagnostics.NUXT_AUTH_NO_DATABASE_PROVIDER(),
      },
    })).toThrow('Missing or incomplete diagnostic documentation: NUXT_AUTH_MISSING_CONFIG')
  })

  it('rejects documentation for removed codes', () => {
    const pages = { ...diagnosticPages, REMOVED_CODE: diagnosticPages.NUXT_AUTH_MISSING_CONFIG }
    expect(() => renderDiagnosticPages(pages)).toThrow('Unknown diagnostic documentation: REMOVED_CODE')
  })

  it('removes obsolete generated pages and leaves unchanged files untouched', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'better-auth-diagnostic-docs-'))
    dirs.push(dir)
    await generateDiagnosticPages(dir)
    await writeFile(join(dir, 'obsolete.md'), 'stale error page')
    const indexPath = join(dir, '0.index.md')
    const oldTime = new Date('2020-01-01T00:00:00Z')
    await utimes(indexPath, oldTime, oldTime)

    await generateDiagnosticPages(dir)

    expect(await readdir(dir)).not.toContain('obsolete.md')
    expect((await stat(indexPath)).mtime.toISOString()).toBe(oldTime.toISOString())
    expect(await readFile(indexPath, 'utf8')).toContain('/errors/nuxt-auth-missing-config')
  })
})
