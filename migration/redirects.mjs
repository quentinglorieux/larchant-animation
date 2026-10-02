// Construit site/redirects.json : anciennes URLs Hugo (sitemap live) vers les nouvelles URLs Nuxt.
import { readFileSync, writeFileSync } from 'node:fs'
import { api } from './lib/directus.mjs'
import { hugoUrlize } from './lib/content.mjs'

const xml = await (await fetch('https://larchantanimation.fr/sitemap.xml')).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => decodeURIComponent(new URL(m[1], 'https://larchantanimation.fr').pathname).normalize('NFC'))

const SECTIONS = { articles: 'blog', newsletters: 'newsletters', ateliers: 'ateliers', activites: 'activites', evenements: 'evenements', pages: '' }
const byOld = new Map()
for (const [col, prefix] of Object.entries(SECTIONS)) {
  for (const it of await api.get(`/items/${col}?limit=-1&fields=slug,legacy_path`)) {
    if (!it.legacy_path) continue
    const old = '/' + hugoUrlize(it.legacy_path.replace(/^content\//, '').replace(/(\/index)?\.md$/, '')) + '/'
    // Les newsletters n'ont pas de page de détail : elles pointent vers la liste.
    byOld.set(old, col === 'newsletters' ? '/newsletters' : prefix ? `/${prefix}/${it.slug}` : `/${it.slug}`)
  }
}
const manual = JSON.parse(readFileSync(new URL('./redirects-manual.json', import.meta.url), 'utf8'))
const out = {}
const unmatched = []
for (const u of new Set([...urls, ...Object.keys(manual)])) {
  const key = u.endsWith('/') ? u : `${u}/`
  const target = manual[key] ?? byOld.get(key)
  if (target === undefined) { unmatched.push(key); continue }
  if (target.replace(/\/$/, '') !== key.slice(0, -1)) out[key] = target // pas de redirection vers soi-même
}
writeFileSync(new URL('../site/redirects.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log(`${Object.keys(out).length} redirections ; ${unmatched.length} URL(s) sans correspondance :`)
for (const u of unmatched) console.log('  ', u)
process.exit(unmatched.length ? 1 : 0)
