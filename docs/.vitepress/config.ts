import { defineConfig } from 'vitepress'
import apiSidebar from '../api/typedoc-sidebar.json'
import { withMermaid } from 'vitepress-plugin-mermaid'
import demonster, { buildDemosSidebar } from './plugins/demonster'

const DEMO_OPTIONS = {
  mountPath: '/demos',
  categories: [
    {
      slug: 'core',
      label: 'Core Concepts',
      description: 'The fundamental building blocks of MosaicJS.',
      order: 1
    }
  ]
}

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'MosaicJS',
    description: 'Event-driven drag-and-drop engine for WhittakerTech',
    base: '/',
    head: [
      ['link', { rel: 'icon', href: '/mosaic-js-logo.svg' }],
      ['link', { rel: 'icon', href: '/mosaic-js-logo.svg', media: "(prefers-color-scheme: light)"}],
      ['link', { rel: 'icon', href: '/mosaic-js-logo-dark.svg', media: "(prefers-color-scheme: dark)"}]
    ],

    vite: {
      plugins: [
        demonster(DEMO_OPTIONS)
      ]
    },

    themeConfig: {
      outline: [2, 3],
      logo: {
        light: '/mosaic-js-logo.svg',
        dark: '/mosaic-js-logo-dark.svg'
      },
      search: {
        provider: 'local'
      },
      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/whittakertech/mosaic_js',
          ariaLabel: "WhittakerTech's MosaicJS on GitHub"
        },
        {
          icon: 'x',
          link: 'https://x.com/whittakertech/',
          ariaLabel: "WhittakerTech on X"
        }
      ],
      nav: [
        { text: 'Getting Started', link: '/getting-started' },
        { text: 'Demos', link: '/demos' },
        { text: 'API', link: '/api/' },
        { text: 'Guides', link: '/guides/architecture' }
      ],
      sidebar: {
        "/api/": {
          items: apiSidebar
        },
        "/demos/": {
          items: buildDemosSidebar(DEMO_OPTIONS)
        },
        "/guides/": {
          base: "/guides/",
          items: [
            { text: "Architecture", link: "architecture" },
            { text: "Constraints Design" , link: "constraints-design" },
            { text: "CSS Contract", link: "css-contract" },
            { text: "Drag Lifecycle", link: "drag-lifecycle" },
            { text: "Snapshot Flow", link: "snapshot-flow" }
          ]
        }
      }
    }
  })
)
