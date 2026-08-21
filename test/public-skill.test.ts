import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import yaml from 'yaml'

const bundleRoot = resolve('docs/public/.well-known/skills')
const skillRoot = join(bundleRoot, 'nuxt-better-auth')

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [relative(skillRoot, path)]
  }).sort()
}

describe('public skill bundle', () => {
  it('keeps its manifest, frontmatter, links, and code fences valid', () => {
    const manifest = JSON.parse(readFileSync(join(bundleRoot, 'index.json'), 'utf8'))
    const skill = manifest.skills.find((entry: { name: string }) => entry.name === 'nuxt-better-auth')
    const skillMarkdown = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
    const frontmatterMatch = skillMarkdown.match(/^---\n([\s\S]*?)\n---/)

    expect(skill).toBeDefined()
    expect(frontmatterMatch).not.toBeNull()
    if (!skill || !frontmatterMatch)
      return

    const frontmatter = yaml.parse(frontmatterMatch[1])
    expect(skill.name).toBe(frontmatter.name)
    expect(skill.description).toBe(frontmatter.description)
    expect([...skill.files].sort()).toEqual(listFiles(skillRoot))

    for (const file of skill.files as string[]) {
      const path = join(skillRoot, file)
      const contents = readFileSync(path, 'utf8')
      const fences = contents.match(/^```/gm) ?? []

      expect(fences.length % 2, `${file} has an unclosed code fence`).toBe(0)

      for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1]
        if (/^(?:https?:|#)/.test(target))
          continue

        expect(existsSync(resolve(dirname(path), target)), `${file} links to missing ${target}`).toBe(true)
      }
    }
  })
})
