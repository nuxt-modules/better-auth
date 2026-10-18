import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { diagnostics } from '../../src/module/diagnostics'
import type { DiagnosticCode, DiagnosticPage } from './pages'
import { diagnosticPages } from './pages'

export function renderDiagnosticPages(pages: Partial<Record<DiagnosticCode, DiagnosticPage>> = diagnosticPages): Map<string, string> {
  const files = new Map<string, string>()
  const links: string[] = []
  const codes = Object.keys(diagnostics) as DiagnosticCode[]

  for (const code of Object.keys(pages)) {
    if (!(code in diagnostics))
      throw new Error(`Unknown diagnostic documentation: ${code}`)
  }

  for (const code of codes) {
    const page = pages[code]
    if (!page || page.example.code !== code || !page.title || !page.description || !page.cause || !page.solution || !page.verify)
      throw new Error(`Missing or incomplete diagnostic documentation: ${code}`)

    const diagnostic = page.example
    const slug = code.toLowerCase().replaceAll('_', '-')
    const path = `/errors/${slug}`
    if (diagnostic.docs !== `https://better-auth.nuxt.dev${path}` || !diagnostic.fix)
      throw new Error(`Diagnostic needs a fix and a matching documentation URL: ${code}`)

    files.set(`${slug}.md`, `---
title: ${JSON.stringify(`${code}: ${page.title}`)}
description: ${JSON.stringify(page.description)}
navigation:
  title: ${JSON.stringify(page.title)}
editPath: diagnostics/pages.ts
---

\`\`\`txt [Example error]
[${code}] ${diagnostic.message}
\`\`\`

## Why this happens

${page.cause}

## How to fix it

${diagnostic.fix}

${page.solution}

## Verify the fix

${page.verify}

See [${page.guide.label}](${page.guide.path}) or return to the [error reference](/errors).
`)
    links.push(`- [${code}: ${page.title}](${path}){.block}`)
  }

  files.set('0.index.md', `---
title: Error reference
description: Find the cause and fix for Nuxt Better Auth module setup and schema generation errors.
navigation:
  title: Overview
editPath: diagnostics/generate.ts
---

Use the diagnostic code from your terminal to find its cause, a fix example, and a way to check the result. These codes describe module setup and schema generation. Sign-in errors retain Better Auth's codes, and session authorization failures retain their HTTP 401 or 403 status.

${links.join('\n')}

If a config cannot load during development, the module skips schema regeneration and preserves the existing schema. Production builds fail on the same config error. Read the specific diagnostic before creating a database migration.
`)
  files.set('.navigation.yml', 'title: Errors\nicon: i-lucide-circle-alert\n')
  return files
}

// The output directory contains only generated files. Compare before writing so
// reloading nuxt.config does not trigger another Content rebuild unnecessarily.
export async function generateDiagnosticPages(outputDir: string): Promise<void> {
  const files = renderDiagnosticPages()
  await mkdir(outputDir, { recursive: true })
  for (const [name, content] of files) {
    const path = join(outputDir, name)
    const previous = await readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT')
        throw error
      return undefined
    })
    if (previous !== content)
      await writeFile(path, content)
  }
  for (const name of await readdir(outputDir)) {
    if (name.endsWith('.md') && !files.has(name))
      await unlink(join(outputDir, name))
  }
}
