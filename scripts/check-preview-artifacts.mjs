import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = new URL('../dist', import.meta.url)

const checks = [
  {
    label: 'broken NuxtHub relative import',
    pattern: '../hub/db.mjs',
    scope: ['dist/module.mjs'],
  },
  {
    label: 'physical NuxtHub DB import',
    pattern: 'node_modules/@nuxthub/db',
    scope: ['dist/module.mjs'],
  },
  {
    label: 'server runtime nitropack import',
    pattern: 'nitropack/runtime',
    scope: ['dist/runtime/server', 'dist/runtime/server/api'],
  },
]

function walk(dirUrl) {
  const entries = readdirSync(dirUrl, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const entryUrl = new URL(entry.name, `${dirUrl.href.endsWith('/') ? dirUrl.href : `${dirUrl.href}/`}`)
    if (entry.isDirectory())
      return walk(entryUrl)
    return [entryUrl]
  })
}

function filesForScope(scopePath) {
  const scopeUrl = new URL(`../${scopePath}`, import.meta.url)
  const stats = statSync(scopeUrl)
  if (stats.isDirectory())
    return walk(scopeUrl)
  return [scopeUrl]
}

const failures = []

for (const check of checks) {
  for (const scopePath of check.scope) {
    for (const fileUrl of filesForScope(scopePath)) {
      const content = readFileSync(fileUrl, 'utf8')
      if (!content.includes(check.pattern))
        continue

      failures.push({
        check: check.label,
        pattern: check.pattern,
        file: relative(rootDir, fileURLToPath(fileUrl)),
      })
    }
  }
}

if (failures.length > 0) {
  console.error('[preview-check] Invalid package output detected:')
  for (const failure of failures)
    console.error(`- ${failure.check}: found "${failure.pattern}" in ${failure.file}`)
  process.exit(1)
}

console.log(`[preview-check] Built package output looks correct in ${relative(rootDir, fileURLToPath(distDir))}`)
