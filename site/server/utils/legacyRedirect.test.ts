import { describe, it, expect } from 'vitest'
import { buildLegacyMap, legacyRedirectTarget } from './legacyRedirect'

const map = buildLegacyMap({
  '/posts/2024-06-08-pétanque/': '/blog/petanque-2024',
  '/ateliers/Djembe/': '/ateliers/djembe'
})

describe('legacyRedirectTarget', () => {
  it('retrouve une URL en majuscules, encodée', () => {
    expect(legacyRedirectTarget('/posts/2024-06-08-P%C3%A9tanque/', map)).toBe('/blog/petanque-2024')
  })
  it('retrouve une URL en Unicode décomposé (NFD), sans slash final', () => {
    expect(legacyRedirectTarget(encodeURI('/posts/2024-06-08-pétanque'), map)).toBe('/blog/petanque-2024')
  })
  it('ne touche pas un chemin déjà normalisé (page existante, ou laissé aux route rules)', () => {
    expect(legacyRedirectTarget('/ateliers/djembe', map)).toBeNull()
    expect(legacyRedirectTarget('/posts/2024-06-08-p%C3%A9tanque/', map)).toBeNull()
  })
  it('redirige une variante en majuscules sans boucler', () => {
    expect(legacyRedirectTarget('/ateliers/DJEMBE', map)).toBe('/ateliers/djembe')
  })
  it('ignore les chemins inconnus ou mal encodés', () => {
    expect(legacyRedirectTarget('/Blog/Inconnu', map)).toBeNull()
    expect(legacyRedirectTarget('/posts/%E0%A4%A', map)).toBeNull()
  })
})
