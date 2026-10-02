import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, stripDate, rewriteBody, extractInscription, editionYear, hugoUrlize, mimeFor } from './content.mjs'

test('slugify retire accents et apostrophes', () => {
  assert.equal(slugify('L’Hivernale c’est parti !'), 'l-hivernale-c-est-parti')
})
test('stripDate retire le préfixe de date', () => {
  assert.equal(stripDate('2025-03-09-Hivernale_2025.md'), 'Hivernale_2025')
  assert.equal(stripDate('2025-02-encordes.md'), 'encordes')
})
test('rewriteBody réécrit images, liens et src en /assets relatif', () => {
  const r = (u) => (u.endsWith('a.jpg') ? 'uuid-a' : u.endsWith('.gpx') ? 'uuid-g' : null)
  assert.equal(rewriteBody('![x](a.jpg) [gpx](/gpx/t.gpx) <img src="a.jpg">', r),
    '![x](/assets/uuid-a) [gpx](/assets/uuid-g) <img src="/assets/uuid-a">')
})
test('rewriteBody laisse les liens externes, déjà migrés et inconnus', () => {
  assert.equal(rewriteBody('[s](https://x.fr) ![y](nope.png) ![z](/assets/abc)', () => 'X'),
    '[s](https://x.fr) ![y](/assets/X) ![z](/assets/abc)')
  assert.equal(rewriteBody('![y](nope.png)', () => null), '![y](nope.png)')
})
test('extractInscription récupère le lien du bouton HTML et le retire', () => {
  const body = 'Intro\n<a class="flex" href="https://yapla.com/e1">\n<button class="px-4"> Inscriptions 2026 </button>\n</a>\nSuite'
  assert.deepEqual(extractInscription(body), { body: 'Intro\n\nSuite', inscriptionUrl: 'https://yapla.com/e1' })
})
test('extractInscription ignore les boutons commentés', () => {
  const body = '<!-- <a href="https://x"><button>Inscriptions</button></a> -->\nTexte'
  assert.deepEqual(extractInscription(body), { body: 'Texte', inscriptionUrl: null })
})
test('editionYear : suffixe de fichier prioritaire, sinon date, date bidon ignorée', () => {
  assert.equal(editionYear('index24.md', '2023-01-01'), 2024)
  assert.equal(editionYear('index.md', '2026-03-08'), 2026)
  assert.equal(editionYear('index.md', '2023-01-01'), null)
  assert.equal(editionYear('index.md', null), null)
  assert.equal(editionYear('index.md', new Date('2023-01-01')), null)
  assert.equal(editionYear('index.md', new Date('2026-03-08T00:00:00Z')), 2026)
  assert.equal(editionYear('index.md', 'pas une date'), null)
})
test('hugoUrlize reproduit les URLs du sitemap live', () => {
  assert.equal(hugoUrlize('posts/2024-06-08-Pétanque'), 'posts/2024-06-08-pétanque')
  assert.equal(hugoUrlize('posts/2025-03-09-Hivernale_2025'), 'posts/2025-03-09-hivernale_2025')
  assert.equal(hugoUrlize('news/2026-05-16-l’incroyable-sister-rosetta-tharpe-–-spectacle-musical'),
    'news/2026-05-16-lincroyable-sister-rosetta-tharpe--spectacle-musical')
  assert.equal(hugoUrlize('news/2026-01-06-l’hivernale-c’est-parti-pour-les-inscriptions copy'),
    'news/2026-01-06-lhivernale-cest-parti-pour-les-inscriptions-copy')
  assert.equal(hugoUrlize('news/2026-07-18-⚠️-accès-interdit'), 'news/2026-07-18-️-accès-interdit')
  assert.equal(hugoUrlize('ateliers/Djembe'), 'ateliers/djembe')
})
test('hugoUrlize normalise en NFC (noms de fichiers macOS en NFD)', () => {
  assert.equal(hugoUrlize('posts/Pe\u0301tanque'), 'posts/p\u00e9tanque')
})
test('mimeFor', () => {
  assert.equal(mimeFor('a.JPG'), 'image/jpeg')
  assert.equal(mimeFor('t.gpx'), 'application/gpx+xml')
  assert.equal(mimeFor('r.pdf'), 'application/pdf')
})
