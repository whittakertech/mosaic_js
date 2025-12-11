import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Mosaic',
  description: 'Event-driven drag-and-drop engine for WhittakerTech',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'API', link: '/api/mosaic' },
      { text: 'Guides', link: '/guides/architecture' }
    ],
    sidebar: {
      '/api/': [
        { text: 'Mosaic', link: '/api/mosaic' },
        { text: 'Snapshot', link: '/api/snapshot' },
        { text: 'Constraints', link: '/api/constraints' },
        { text: 'Events', link: '/api/events' },
        { text: 'Drag (v0.2)', link: '/api/drag' },
      ],

      '/guides/': [
        { text: 'Architecture', link: '/guides/architecture' },
        { text: 'Snapshot Flow', link: '/guides/snapshot-flow' },
        { text: 'Constraints Design', link: '/guides/constraints-design' },
        { text: 'Drag Lifecycle', link: '/guides/drag-lifecycle' }
      ]
    }
  }
})