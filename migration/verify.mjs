// Vérifie : comptes par collection, médias référencés présents, toutes les anciennes URLs en 200 ou 301 puis 200.
import { readdirSync, readFileSync } from 'node:fs'
import { api } from './lib/directus.mjs'

const SITE = (process.argv[2] || 'http://localhost:13010').replace(/\/$/, '')
let failures = 0
const fail = (m) => { failures++; console.log('  ✗', m) }
const mdCount = (dir) => readdirSync(new URL(`../content/${dir}`, import.meta.url)).filter((f) => f.endsWith('.md')).length
const count = async (c) => Number((await api.get(`/items/${c}?aggregate[count]=*`))[0].count)

console.log('[comptes]')
// Les doublons news/posts listés "drop" ne sont volontairement pas importés.
const dropped = JSON.parse(readFileSync(new URL('./articles-duplicates.json', import.meta.url), 'utf8')).length
const expectedArticles = mdCount('posts') + mdCount('news') - dropped
const nArticles = await count('articles')
if (nArticles !== expectedArticles) fail(`articles : ${nArticles} en base, ${expectedArticles} attendus (fichiers moins ${dropped} doublons)`)
for (const c of ['evenements', 'editions', 'ateliers', 'activites', 'pages', 'newsletters', 'accueil_slides']) console.log(`  ${c}: ${await count(c)}`)

console.log('[médias référencés]')
const ids = new Set((await api.get('/files?limit=-1&fields=id')).map((f) => f.id))
for (const c of ['editions', 'articles', 'ateliers', 'activites', 'pages', 'evenements']) {
  for (const it of await api.get(`/items/${c}?limit=-1`)) {
    const text = Object.values(it).filter((v) => typeof v === 'string').join(' ')
    for (const [, id] of text.matchAll(/\/assets\/([0-9a-f-]{36})/g)) if (!ids.has(id)) fail(`${c}#${it.id} : média ${id} absent`)
    if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(text)) fail(`${c}#${it.id} : URL locale dans le contenu`)
  }
}

console.log('[anciennes URLs]')
const xml = await (await fetch('https://larchantanimation.fr/sitemap.xml')).text()
const old = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1], 'https://larchantanimation.fr').pathname)
for (const p of old) {
  const r = await fetch(SITE + p, { redirect: 'manual' })
  if (r.status === 301) {
    const to = new URL(r.headers.get('location'), SITE)
    const r2 = await fetch(to)
    if (r2.status !== 200) fail(`${p} → ${to.pathname} : ${r2.status}`)
  } else if (r.status !== 200) {
    fail(`${p} : ${r.status}`)
  }
}
console.log(`  ${old.length} URLs testées`)
console.log(failures ? `\n❌ ${failures} problème(s)` : '\n✅ Tout est bon')
process.exit(failures ? 1 : 0)
