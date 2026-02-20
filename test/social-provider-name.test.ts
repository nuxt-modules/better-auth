import { describe, expect, it } from 'vitest'
import { getSocialProviderName, SOCIAL_PROVIDER_NAMES } from '../src/runtime/utils/social-provider-name'

describe('getSocialProviderName', () => {
  it('returns canonical names for known providers', () => {
    expect(getSocialProviderName('github')).toBe('GitHub')
    expect(getSocialProviderName('gitlab')).toBe('GitLab')
    expect(getSocialProviderName('tiktok')).toBe('TikTok')
    expect(getSocialProviderName('vk')).toBe('VK')
  })

  it('formats unknown provider ids into title case', () => {
    expect(getSocialProviderName('acme-sso')).toBe('Acme Sso')
    expect(getSocialProviderName('my_custom_provider')).toBe('My Custom Provider')
  })

  it('trims and normalizes case before resolving names', () => {
    expect(getSocialProviderName('  GITHUB  ')).toBe('GitHub')
    expect(getSocialProviderName('')).toBe('')
  })

  it('stays consistent with SOCIAL_PROVIDER_NAMES entries', () => {
    for (const [provider, name] of Object.entries(SOCIAL_PROVIDER_NAMES))
      expect(getSocialProviderName(provider)).toBe(name)
  })
})
