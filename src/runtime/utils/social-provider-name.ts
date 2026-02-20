export const SOCIAL_PROVIDER_NAMES = {
  apple: 'Apple',
  atlassian: 'Atlassian',
  cognito: 'Cognito',
  discord: 'Discord',
  dropbox: 'Dropbox',
  facebook: 'Facebook',
  figma: 'Figma',
  github: 'GitHub',
  gitlab: 'GitLab',
  google: 'Google',
  huggingface: 'Hugging Face',
  kakao: 'Kakao',
  kick: 'Kick',
  line: 'LINE',
  linear: 'Linear',
  linkedin: 'LinkedIn',
  microsoft: 'Microsoft',
  naver: 'Naver',
  notion: 'Notion',
  paybin: 'Paybin',
  paypal: 'PayPal',
  polar: 'Polar',
  reddit: 'Reddit',
  roblox: 'Roblox',
  salesforce: 'Salesforce',
  slack: 'Slack',
  spotify: 'Spotify',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  twitter: 'Twitter',
  vercel: 'Vercel',
  vk: 'VK',
  zoom: 'Zoom',
} as const

export function getSocialProviderName(provider: string): string {
  const normalized = provider.trim().toLowerCase()
  if (!normalized)
    return ''

  const knownName = (SOCIAL_PROVIDER_NAMES as Record<string, string>)[normalized]
  if (knownName)
    return knownName

  return normalized
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
