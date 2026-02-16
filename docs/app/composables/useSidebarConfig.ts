export interface SidebarItem {
  title: string
  href: string
  icon?: string
  isNew?: boolean
}

export interface SidebarSection {
  title: string
  icon: string
  isNew?: boolean
  items: SidebarItem[]
}

export function useSidebarConfig() {
  const sections: SidebarSection[] = [
    {
      title: 'Getting Started',
      icon: 'i-solar-play-circle-bold',
      items: [
        { title: 'Introduction', href: '/getting-started', icon: 'i-solar-play-bold' },
        { title: 'Installation', href: '/getting-started/installation', icon: 'i-solar-download-square-bold' },
        { title: 'Configuration', href: '/getting-started/configuration', icon: 'i-solar-settings-bold' },
        { title: 'Client Setup', href: '/getting-started/client-setup', icon: 'i-solar-monitor-bold' },
        { title: 'Type Augmentation', href: '/getting-started/type-augmentation', icon: 'i-solar-code-file-bold' },
        { title: 'Schema Generation', href: '/getting-started/schema-generation', icon: 'i-solar-database-bold' },
      ],
    },
    {
      title: 'Core Concepts',
      icon: 'i-solar-book-bookmark-bold',
      items: [
        { title: 'How It Works', href: '/getting-started/how-it-works', icon: 'i-solar-lightbulb-bolt-bold' },
        { title: 'Server Auth', href: '/core-concepts/server-auth', icon: 'i-solar-server-bold' },
        { title: 'Sessions', href: '/core-concepts/sessions', icon: 'i-solar-key-bold' },
        { title: 'Route Protection', href: '/core-concepts/route-protection', icon: 'i-solar-shield-check-bold' },
        { title: 'Auto Imports', href: '/core-concepts/auto-imports-aliases', icon: 'i-solar-box-bold' },
        { title: 'Security', href: '/core-concepts/security-caveats', icon: 'i-solar-danger-triangle-bold' },
      ],
    },
    {
      title: 'Guides',
      icon: 'i-solar-map-bold',
      items: [
        { title: 'Custom Database', href: '/guides/custom-database', icon: 'i-solar-database-bold' },
        { title: 'Database-less Mode', href: '/guides/database-less-mode', icon: 'i-solar-cloud-bold' },
        { title: 'External Auth Backend', href: '/guides/external-auth-backend', icon: 'i-lucide-server' },
        { title: 'OAuth Providers', href: '/guides/oauth-providers', icon: 'i-solar-user-id-bold' },
        { title: 'Role-Based Access', href: '/guides/role-based-access', icon: 'i-solar-users-group-rounded-bold' },
        { title: 'Two-Factor Auth', href: '/guides/two-factor-auth', icon: 'i-solar-lock-bold' },
        { title: 'Testing', href: '/guides/testing', icon: 'i-solar-test-tube-bold' },
        { title: 'Migrate from Nuxt Auth Utils', href: '/guides/migrate-from-nuxt-auth-utils', icon: 'i-solar-transfer-horizontal-bold' },
        { title: 'Production Deployment', href: '/guides/production-deployment', icon: 'i-solar-rocket-bold' },
      ],
    },
    {
      title: 'Integrations',
      icon: 'i-solar-plug-circle-bold',
      items: [
        { title: 'NuxtHub', href: '/integrations/nuxthub', icon: 'i-simple-icons-nuxtdotjs' },
        { title: 'DevTools', href: '/integrations/devtools', icon: 'i-solar-tuning-square-bold' },
        { title: 'i18n', href: '/integrations/i18n', icon: 'i-lucide-languages' },
        { title: 'Convex (Status)', href: '/integrations/convex', icon: 'i-custom-convex' },
      ],
    },
    {
      title: 'API',
      icon: 'i-solar-code-square-bold',
      items: [
        { title: 'Composables', href: '/api/composables', icon: 'i-solar-monitor-smartphone-bold' },
        { title: 'Server Utilities', href: '/api/server-utils', icon: 'i-solar-server-square-bold' },
        { title: 'Components', href: '/api/components', icon: 'i-solar-widget-bold' },
        { title: 'Types', href: '/api/types', icon: 'i-solar-code-file-bold' },
      ],
    },
  ]

  const standaloneLinks: SidebarItem[] = [
    { title: 'FAQ', href: '/troubleshooting/faq', icon: 'i-solar-question-circle-bold' },
  ]

  return { sections, standaloneLinks }
}
