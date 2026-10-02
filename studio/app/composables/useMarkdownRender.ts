import MarkdownIt from 'markdown-it'

// Mêmes options que site/app/composables/useMarkdown.ts : l'aperçu correspond au rendu du site.
const md = new MarkdownIt({ html: true, breaks: true, linkify: true })

export function useMarkdownRender() {
  return { render: (text?: string | null) => (text ? md.render(text) : '') }
}
