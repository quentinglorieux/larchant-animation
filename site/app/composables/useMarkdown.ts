import MarkdownIt from 'markdown-it'

// html:true car certains corps migrés contiennent du HTML inline (boutons d'inscription).
const md = new MarkdownIt({ html: true, breaks: true, linkify: true })

export function useMarkdown() {
  function render(text: string | null | undefined): string {
    if (!text) return ''
    return md.render(text)
  }
  return { render }
}
