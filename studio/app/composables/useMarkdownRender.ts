import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// Mêmes options que site/app/composables/useMarkdown.ts : l'aperçu correspond au rendu du site.
const md = new MarkdownIt({ html: true, breaks: true, linkify: true })

// L'aperçu s'affiche dans l'origine du Studio (jeton Directus en localStorage) :
// le HTML saisi par un éditeur est assaini avant injection.
export function useMarkdownRender() {
  return {
    render: (text?: string | null) => {
      if (!text) return ''
      const html = md.render(text)
      return typeof window === 'undefined' ? '' : DOMPurify.sanitize(html)
    }
  }
}
