import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { PluginOption } from 'vite'

export interface DemonsterCategory {
  slug: string
  label?: string
  description?: string
  order?: number
}

export interface DemonsterOptions {
  demoDir?: string
  sourceDir?: string
  outputDir?: string
  mountPath?: string
  strictCategories?: boolean
  categories?: DemonsterCategory[]
  iframe?: {
    defaultHeight?: number
    border?: boolean
    rounded?: boolean
  }
}

interface DemoMeta {
  title: string
  category: string
  description?: string
  order?: number
  layout?: any[]
  assets?: { src: string; dest: string }[]
}

interface Demo {
  slug: string
  category: string
  dir: string
  meta: DemoMeta
  html: string
  css: string
  js: string
}

const DEFAULTS: Required<Omit<DemonsterOptions, 'categories'>> = {
  demoDir: 'demos',
  sourceDir: 'demos',
  outputDir: 'demos',
  mountPath: '/demos',
  strictCategories: false,
  iframe: {
    defaultHeight: 480,
    border: true,
    rounded: true
  }
}

function titleCase(str: string) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

function warn(msg: string) {
  console.warn(`[DEMONSTER] ${msg}`)
}

function loadYaml(file: string): DemoMeta {
  return yaml.load(fs.readFileSync(file, 'utf8')) as DemoMeta
}

// ----------------------------------------------------
// IFRAME
// ----------------------------------------------------

function buildIframeHTML(demo: Demo, docsRoot: string) {
  const template = fs.readFileSync(
    path.join(docsRoot, 'demos/_templates/iframe.html'),
    'utf8'
  )

  return template
    .replace('{{CSS}}', demo.css)
    .replace('{{HTML}}', demo.html)
    .replace('{{JS}}', demo.js)
}

// ----------------------------------------------------
// PAGE RENDER
// ----------------------------------------------------
function renderMarkdownBlock(block: any, demo: Demo, mountPath: string, iframe: any) {
  switch (block.type) {
    case 'heading':
      return `\n## ${block.text}\n`

    case 'markdown':
      if (block.text) return `\n${block.text}\n`
      if (block.file) {
        const f = path.join(demo.dir, block.file)
        return fs.existsSync(f) ? `\n${fs.readFileSync(f, 'utf8')}\n` : ''
      }
      return ''

    case 'demo': {
      const height = block.height ?? iframe.defaultHeight
      const border = block.border === false ? 'none' : iframe.border ? '1px solid #ddd' : 'none'
      const radius = block.rounded === false ? '0px' : iframe.rounded ? '8px' : '0px'

      return `
<iframe
  src="${mountPath}/_iframes/${demo.category}/${demo.slug}/index.html"
  style="
    width:100%;
    height:${height}px;
    border:${border};
    border-radius:${radius};
  "
></iframe>`
    }

    case 'code': {
      const fp = path.join(demo.dir, block.file)
      if (!fs.existsSync(fp)) return ''
      const contents = fs.readFileSync(fp, 'utf8')

      let lang =
        block.language ??
        (fp.endsWith('.html') ? 'html'
          : fp.endsWith('.css') ? 'css'
            : fp.endsWith('.js') ? 'js'
              : '')

      return `
\`\`\`${lang}
${contents}
\`\`\`
`
    }

    default:
      return ''
  }
}

function buildPageMarkdown(demo: Demo, mountPath: string, iframe: any) {
  const body =
    demo.meta.layout?.map(b => renderMarkdownBlock(b, demo, mountPath, iframe)).join('\n') ??
    ''

  return `---
title: ${demo.meta.title}
description: ${demo.meta.description ?? ''}
---

${body}
`
}

// ----------------------------------------------------
// DEMO COLLECTION
// ----------------------------------------------------
function collectDemos(root: string): Demo[] {
  if (!fs.existsSync(root)) return []

  const categories = fs.readdirSync(root).filter(f =>
    fs.statSync(path.join(root, f)).isDirectory()
  )

  const demos: Demo[] = []

  for (const category of categories) {
    const categoryDir = path.join(root, category)

    const demoDirs = fs
      .readdirSync(categoryDir)
      .filter(n => !n.startsWith('_'))
      .map(n => path.join(categoryDir, n))
      .filter(p => fs.statSync(p).isDirectory())

    for (const dir of demoDirs) {
      const slug = path.basename(dir)

      const meta = loadYaml(path.join(dir, 'meta.yml'))
      if (!meta.title) meta.title = slug
      meta.category = category

      demos.push({
        slug,
        category,
        dir,
        meta,
        html: fs.readFileSync(path.join(dir, 'demo.html'), 'utf8'),
        css: fs.readFileSync(path.join(dir, 'demo.css'), 'utf8'),
        js: fs.readFileSync(path.join(dir, 'demo.js'), 'utf8')
      })
    }
  }

  return demos.sort((a, b) => (a.meta.order ?? 9999) - (b.meta.order ?? 9999))
}

// ----------------------------------------------------
// PLUGIN
// ----------------------------------------------------
export default function demonster(options: DemonsterOptions = {}): PluginOption {
  const config = { ...DEFAULTS, ...options, iframe: { ...DEFAULTS.iframe, ...(options.iframe ?? {}) } }

  return {
    name: 'vitepress-plugin-demonster',

    config() {
      const docsRoot = path.resolve(process.cwd(), 'docs')
      const sourceRoot = path.resolve(process.cwd(), config.sourceDir)
      const root = path.join(docsRoot, config.demoDir)
      const out = path.join(docsRoot, config.outputDir)

      const demos = collectDemos(sourceRoot)

      fs.mkdirSync(out, { recursive: true })

      const iframeRoot = path.join(docsRoot, 'public', config.outputDir, '_iframes')
      fs.mkdirSync(iframeRoot, { recursive: true })

      // ------------------------------------
      // CATEGORY METADATA
      // ------------------------------------
      const categoryMeta = new Map<string, DemonsterCategory>()

      // Seed from user config
      for (const c of options.categories ?? []) {
        categoryMeta.set(c.slug, {
          slug: c.slug,
          label: c.label ?? titleCase(c.slug),
          description: c.description ?? '',
          order: c.order ?? 9999
        })
      }

      // Ensure all categories exist
      for (const d of demos) {
        if (!categoryMeta.has(d.category)) {
          warn(`Injecting implicit category: ${d.category}`)
          categoryMeta.set(d.category, {
            slug: d.category,
            label: titleCase(d.category),
            description: '',
            order: 9999
          })
        }
      }

      const orderedCategories = Array.from(categoryMeta.values()).sort(
        (a, b) => (a.order ?? 9999) - (b.order ?? 9999)
      )

      // ------------------------------------
      // GROUP DEMOS
      // ------------------------------------
      const grouped = new Map<string, Demo[]>()
      for (const demo of demos) {
        if (!grouped.has(demo.category)) grouped.set(demo.category, [])
        grouped.get(demo.category)!.push(demo)
      }

      const categoryLookup = new Map<string, DemonsterCategory>()

      ;(options.categories ?? []).forEach(cat => {
        categoryLookup.set(cat.slug, cat)
      })

      // ------------------------------------
      // CATEGORY PAGES
      // ------------------------------------
      for (const cat of orderedCategories) {
        const list = grouped.get(cat.slug) ?? []
        const dir = path.join(out, cat.slug)
        fs.mkdirSync(dir, { recursive: true })

        const md = `---
title: ${cat.label}
---

# ${cat.label}

${cat.description ?? ''}

${list.map(d => `<!--@include: @/${config.demoDir}/_partials/${cat.slug}/${d.slug}/index.md-->`).join('\n\n')}
`
        fs.writeFileSync(path.join(dir, 'index.md'), md)
      }

      // ------------------------------------
      // MAIN DEMOS INDEX
      // ------------------------------------
      const mainIndex = `# Interactive Demos

Explore MosaicJS behavior live in your browser.

${orderedCategories
        .map(
          c => `
## ${c.label}
${c.description ?? ''}

- [View demos](${c.slug}/)
`
        )
        .join('\n')}
`
      fs.writeFileSync(path.join(out, 'index.md'), mainIndex)

      // ------------------------------------
      // IFRAMES
      // ------------------------------------
      for (const demo of demos) {
        const iframeDir = path.join(iframeRoot, demo.category, demo.slug)
        fs.mkdirSync(iframeDir, { recursive: true })

        fs.writeFileSync(
          path.join(iframeDir, 'index.html'),
          buildIframeHTML(demo, docsRoot)
        )
      }

      // ------------------------------------
      // DEMO PARTIALS (NON-ROUTABLE)
      // ------------------------------------
      const partialsRoot = path.join(docsRoot, config.demoDir, '_partials')

      for (const demo of demos) {
        const partialDir = path.join(partialsRoot, demo.category, demo.slug)
        fs.mkdirSync(partialDir, { recursive: true })

        fs.writeFileSync(
          path.join(partialDir, 'index.md'),
          buildPageMarkdown(demo, config.mountPath, config.iframe)
        )
      }

      return {}
    }
  }
}

export function buildDemosSidebar(options: DemonsterOptions) {
  const config = { ...DEFAULTS, ...options }

  const docsRoot = path.resolve(process.cwd(), 'docs')
  const demosRoot = path.join(docsRoot, config.demoDir)

  const categories = fs
    .readdirSync(demosRoot)
    .filter(name => {
      const full = path.join(demosRoot, name)
      return (
        !name.startsWith('_') &&
        fs.statSync(full).isDirectory() &&
        fs.existsSync(path.join(full, 'index.md'))
      )
    })

  return [
    {
      text: 'Demos',
      link: `${config.mountPath}/`,
      collapsible: true,
      items: categories.map(cat => ({
        text: titleCase(cat),
        link: `${config.mountPath}/${cat}/`
      }))
    }
  ]
}
