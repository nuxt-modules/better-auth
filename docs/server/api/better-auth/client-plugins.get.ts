const DOCS_PLUGIN_RE = /\/docs\/plugins\/([a-z0-9-]+)(?=["\\])/g
const CLIENT_EXPORT_RE = /export\s+(?:declare\s+)?(?:const|function)\s+(\w+)/g
const CLIENT_SUFFIX_RE = /Client$/
const CAMEL_TO_KEBAB_BOUNDARY_RE = /([a-z0-9])([A-Z])/g
const CAMEL_TO_KEBAB_ACRONYM_RE = /([A-Z]+)([A-Z][a-z0-9]+)/g

export default defineEventHandler(async () => {
  const baseDocsUrl = 'https://www.better-auth.com/docs'

  const html = await fetch(`${baseDocsUrl}/introduction`).then(r => r.text())

  const pluginSlugs = new Set<string>()
  for (const pluginMatch of html.matchAll(DOCS_PLUGIN_RE)) {
    if (pluginMatch[1])
      pluginSlugs.add(pluginMatch[1])
  }

  const clientDtsUrl = 'https://unpkg.com/better-auth/dist/client/plugins/index.d.mts'
  const dts = await fetch(clientDtsUrl).then(r => r.text())

  const exportNames = new Set<string>()
  for (const exportMatch of dts.matchAll(CLIENT_EXPORT_RE)) {
    const name = exportMatch[1]
    if (name)
      exportNames.add(name)
  }

  const clientPluginNames = Array.from(exportNames)
    .filter(name => CLIENT_SUFFIX_RE.test(name))
    .sort((a, b) => a.localeCompare(b))

  const camelToKebab = (input: string) =>
    input
      .replace(CAMEL_TO_KEBAB_BOUNDARY_RE, '$1-$2')
      .replace(CAMEL_TO_KEBAB_ACRONYM_RE, '$1-$2')
      .toLowerCase()

  const toSlug = (clientExport: string) => {
    const base = clientExport.replace(CLIENT_SUFFIX_RE, '')
    const candidate = camelToKebab(base)
    const overrides: Record<string, string> = {
      'two-factor': '2fa',
      'o-auth-proxy': 'oauth-proxy',
    }
    return overrides[candidate] || candidate
  }

  return clientPluginNames.map((exportName) => {
    const slug = toSlug(exportName)
    return {
      exportName,
      slug,
      href: pluginSlugs.has(slug) ? `${baseDocsUrl}/plugins/${slug}` : null,
    }
  })
})
