import { defineConfig } from 'vitepress'
import apiSidebar from '../api/typedoc-sidebar.json'

export default defineConfig({
  lang: 'en-US',
  title: 'MosaicJS',
  description: 'Event-driven drag-and-drop engine for WhittakerTech',

  themeConfig: {
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
          { text: "Drag Lifecycle", link: "drag-lifecycle" },
          { text: "Snapshot Flow", link: "snapshot-flow" }
        ]
      }
    }
  }
})