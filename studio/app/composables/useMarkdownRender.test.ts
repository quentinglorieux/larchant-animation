// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { useMarkdownRender } from './useMarkdownRender'

const { render } = useMarkdownRender()

describe('useMarkdownRender', () => {
  it('retire les gestionnaires d’événements', () => {
    const html = render('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
    expect(html).toContain('<img')
  })
  it('garde les liens et les boutons', () => {
    const html = render('<a href="https://x.fr"><button>S’inscrire</button></a>')
    expect(html).toContain('href="https://x.fr"')
    expect(html).toContain('<button>S’inscrire</button>')
  })
  it('retire les scripts', () => {
    expect(render('<script>alert(1)</script>ok')).not.toContain('<script')
  })
})
