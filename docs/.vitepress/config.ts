import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@maxhealth.tech/prefab',
  description:
    'TypeScript declarative UI component library for MCP apps. Wire-compatible with Python prefab-ui.',

  cleanUrls: true,
  lastUpdated: true,

  // Prevent Vue from parsing {{ }} in markdown as template expressions.
  // Our docs use {{ expr }} as literal prefab reactive expression syntax.
  vue: {
    template: {
      compilerOptions: {
        delimiters: ['${', '}'] as [string, string],
      },
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/components' },
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
      copyright: 'Copyright © 2024-present Max Health Inc.',
    },
  },
})
