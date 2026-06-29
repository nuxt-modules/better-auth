const WORD_SEPARATOR_RE = /[-_]+/g
const WORD_INITIAL_RE = /\b\w/g
const OAUTH_RE = /\bOauth\b/g
const OIDC_RE = /\bOidc\b/g
const API_RE = /\bApi\b/g
const DOCS_PLUGIN_RE = /\/docs\/plugins\/([a-z0-9-]+)(?=["\\])/g

export default defineEventHandler(async () => {
  const baseDocsUrl = 'https://www.better-auth.com/docs'

  const titleCase = (slug: string) =>
    slug
      .replace(WORD_SEPARATOR_RE, ' ')
      .replace(WORD_INITIAL_RE, c => c.toUpperCase())
      .replace(OAUTH_RE, 'OAuth')
      .replace(OIDC_RE, 'OIDC')
      .replace(API_RE, 'API')

  const html = await fetch(`${baseDocsUrl}/introduction`).then(r => r.text())

  const slugs = new Set<string>()
  for (const match of html.matchAll(DOCS_PLUGIN_RE)) {
    const slug = match[1]
    if (!slug)
      continue
    slugs.add(slug)
  }

  return Array.from(slugs)
    .sort((a, b) => a.localeCompare(b))
    .map(slug => ({
      slug,
      name: titleCase(slug),
      href: `${baseDocsUrl}/plugins/${slug}`,
    }))
})
