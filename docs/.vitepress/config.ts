import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@maxhealth.tech/prefab',
  description:
    'TypeScript declarative UI component library for MCP apps. Wire-compatible with Python prefab-ui.',

  base: '/prefab/',
  cleanUrls: true,
  lastUpdated: true,

  // Add v-pre to inline <code> so {{ }} isn't parsed as Vue interpolation.
  // Fenced code blocks already get v-pre via Shiki, but inline code does not.
  markdown: {
    config: (md) => {
      const defaultCodeInline = md.renderer.rules.code_inline!
      md.renderer.rules.code_inline = (...args) => {
        return defaultCodeInline(...args).replace('<code>', '<code v-pre>')
      }
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/prefab/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/prefab/brand/logo.svg' }],
  ],

  // Ensure static public/ apps (demo, playground) are served in dev mode.
  // VitePress's SPA router intercepts /demo/ and /playground/ as client routes;
  // this middleware rewrites them to the actual index.html before that happens.
  vite: {
    plugins: [{
      name: 'serve-public-apps',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const publicApps = ['/prefab/demo/', '/prefab/playground/']
          if (req.url && publicApps.includes(req.url)) {
            req.url = req.url.replace(/\/$/, '/index.html')
          }
          next()
        })
      },
    }],
  },

  themeConfig: {
    logo: { light: '/brand/logo.svg', dark: '/brand/logo-light.svg' },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/components' },
      { text: 'Demo', link: '/demo/', target: '_blank' },
      { text: 'Playground', link: '/playground/', target: '_blank' },
      {
        text: 'Links',
        items: [
          {
            text: 'npm',
            link: 'https://www.npmjs.com/package/@maxhealth.tech/prefab',
          },
          {
            text: 'Changelog',
            link: 'https://github.com/Max-Health-Inc/prefab/blob/main/CHANGELOG.md',
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Components', link: '/guide/components' },
            { text: 'Actions', link: '/guide/actions' },
            { text: 'Reactive Expressions', link: '/guide/rx' },
            { text: 'Signals & Collections', link: '/guide/rx#signals--collections' },
            { text: 'Auto-Renderers', link: '/guide/auto-renderers' },
          ],
        },
        {
          text: 'Integration',
          items: [
            { text: 'MCP Display Helpers', link: '/guide/mcp-display' },
            { text: 'Browser Renderer', link: '/guide/renderer' },
            { text: 'ext-apps Bridge', link: '/guide/bridge' },
          ],
        },
      ],

      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Components', link: '/reference/components' },
            { text: 'Actions', link: '/reference/actions' },
            { text: 'Reactive Expressions', link: '/reference/rx' },
            { text: 'Auto-Renderers', link: '/reference/auto-renderers' },
            { text: 'MCP Display', link: '/reference/mcp-display' },
            { text: 'Renderer', link: '/reference/renderer' },
            { text: 'Bridge', link: '/reference/bridge' },
            { text: 'Wire Format', link: '/reference/wire-format' },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Max-Health-Inc/prefab',
      },
    ],

    editLink: {
      pattern:
        'https://github.com/Max-Health-Inc/prefab/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Max Health Inc.',
    },
  },
})
