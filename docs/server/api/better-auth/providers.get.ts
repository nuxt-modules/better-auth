const WORD_SEPARATOR_RE = /[-_]+/g
const WORD_INITIAL_RE = /\b\w/g
const AUTHENTICATION_DOCS_RE = /\/docs\/authentication\/([a-z0-9-]+)(?=["\\])/g

export default defineEventHandler(async () => {
  const baseDocsUrl = 'https://www.better-auth.com/docs'

  const titleCase = (id: string) =>
    id
      .replace(WORD_SEPARATOR_RE, ' ')
      .replace(WORD_INITIAL_RE, c => c.toUpperCase())

  const html = await fetch(`${baseDocsUrl}/introduction`).then(r => r.text())

  const ids = new Set<string>()
  for (const match of html.matchAll(AUTHENTICATION_DOCS_RE)) {
    const id = match[1]
    if (!id || id === 'oauth' || id === 'other-social-providers')
      continue
    ids.add(id)
  }

  return Array.from(ids)
    .sort((a, b) => a.localeCompare(b))
    .map(id => ({
      id,
      name: titleCase(id),
      href: `${baseDocsUrl}/authentication/${id}`,
    }))
})
