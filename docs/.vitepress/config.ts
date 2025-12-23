import { defineConfig } from 'vitepress'
import apiSidebar from '../api/typedoc-sidebar.json'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'MosaicJS',
    description: 'Event-driven drag-and-drop engine for WhittakerTech',
    base: '/',

    themeConfig: {
      logo: {
        light: '/public/mosaic-js-logo.svg',
        dark: '/public/mosaic-js-logo-dark.svg'
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
        { text: 'Home', link: '/' },
        { text: 'Getting Started', link: '/getting-started' },
        { text: 'API', link: '/api/' },
        { text: 'Guides', link: '/guides/architecture' }
      ],
      sidebar: {
        "/api/": {
          items: apiSidebar
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
