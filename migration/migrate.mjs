// Migration one-shot du contenu Hugo (markdown) → Directus.
// Idempotent : ré-exécutable sans créer de doublons (upsert par slug / legacy_path).
// Lancer : node migration/migrate.mjs   (Directus doit tourner + schéma appliqué)
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join, relative, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { api, DIRECTUS_URL } from './lib/directus.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CONTENT = join(ROOT, 'content')
const STATIC = join(ROOT, 'static')

const MEDIA_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.avif'])
const report = { files: 0, categories: 0, evenements: 0, editions: 0, articles: 0, ateliers: 0, activites: 0, newsletters: 0, pages: 0, links: 0, skipped: [] }

// ---------- utilitaires ----------
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
function slugify(s) {
  return norm(s).toLowerCase().replace(/['’]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}
const stripDate = (name) => name.replace(/^\d{4}-\d{2}(-\d{2})?-/, '').replace(/\.md$/, '')
const humanize = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const toForward = (p) => p.split('\\').join('/')

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

// ---------- médias ----------
const byRel = new Map()      // chemin relatif repo → file_id
const byBasename = new Map() // nom de fichier (minuscule) → file_id

async function uploadMedia() {
  console.log('\n[médias]')
  // Pré-charge l'existant pour l'idempotence (title == chemin relatif)
  const existing = await api.get('/files?limit=-1&fields=id,title')
  const existingByTitle = new Map((existing || []).filter((f) => f.title).map((f) => [f.title, f.id]))

  const dirs = [join(STATIC, 'images'), join(STATIC, 'files'), CONTENT]
  const seen = new Set()
  for (const d of dirs) {
    for (const full of walk(d)) {
      if (!MEDIA_EXT.has(extname(full).toLowerCase())) continue
      const rel = toForward(relative(ROOT, full))
      if (seen.has(rel)) continue
      seen.add(rel)
      const base = basename(full).toLowerCase()
      let id = existingByTitle.get(rel)
      if (!id) {
        const buf = readFileSync(full)
        const ext = extname(full).toLowerCase().slice(1)
        const mime = ext === 'pdf' ? 'application/pdf' : (ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`)
        const f = await api.upload(buf, basename(full), mime, { title: rel })
        id = f.id
        report.files++
      }
      byRel.set(rel, id)
      if (!byBasename.has(base)) byBasename.set(base, id)
    }
  }
  console.log(`  ${report.files} nouveaux fichiers, ${byRel.size} médias indexés`)
}

// Résout une référence média (preview/affiche) relative à un fichier markdown
function resolveMedia(mdRelDir, ref) {
  if (!ref) return null
  let r = toForward(String(ref)).replace(/^\.?\//, '')
  const candidates = []
  if (r.startsWith('images/') || r.startsWith('files/')) candidates.push(`static/${r}`)
  else candidates.push(toForward(join(mdRelDir, r)))
  candidates.push(`static/images/${basename(r)}`, `static/files/${basename(r)}`)
  for (const c of candidates) if (byRel.has(c)) return byRel.get(c)
  return byBasename.get(basename(r).toLowerCase()) || null
}

// Réécrit les liens médias dans un corps markdown vers les assets Directus
function rewriteBody(body, mdRelDir) {
  if (!body) return body
  return body.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))|(\bsrc=["'])([^"']+)(["'])/g,
    (m, p1, url1, p3, s1, url2, s3) => {
      const url = url1 || url2
      if (!url || /^(https?:|mailto:|tel:|#|data:)/i.test(url)) return m
      const id = resolveMedia(mdRelDir, url)
      if (!id) return m
      const asset = `${DIRECTUS_URL}/assets/${id}`
      return url1 ? `${p1}${asset}${p3}` : `${s1}${asset}${s3}`
    })
}

// ---------- upsert générique ----------
async function findId(collection, field, value) {
  const data = await api.get(`/items/${collection}?filter[${field}][_eq]=${encodeURIComponent(value)}&limit=1&fields=id`)
  return data?.[0]?.id ?? null
}
async function upsert(collection, keyField, keyValue, payload) {
  const id = await findId(collection, keyField, keyValue)
  if (id) { await api.patch(`/items/${collection}/${id}`, payload); return id }
  const created = await api.post(`/items/${collection}`, { [keyField]: keyValue, ...payload })
  return created.id
}
// Slug unique déterministe : base, puis base-suffix, puis base-suffix-N.
// Idempotent car un slug déjà détenu par notre legacy_path est réutilisé tel quel.
async function uniqueSlug(collection, base, suffix, legacyField, legacyValue) {
  for (let n = 0; ; n++) {
    const cand = n === 0 ? base : (n === 1 && suffix ? `${base}-${suffix}` : `${base}-${suffix || 'x'}-${n}`)
    const rows = await api.get(`/items/${collection}?filter[slug][_eq]=${encodeURIComponent(cand)}&limit=1&fields=id,${legacyField}`)
    if (!rows?.length || rows[0][legacyField] === legacyValue) return cand
  }
}

// ---------- catégories ----------
const CATEGORIES = [
  { name: 'Sport', slug: 'sport', type: 'evenement', couleur: '#3F9C5A', couleur_accent: '#D8F0DE', icon: 'i-lucide-bike' },
  { name: 'Culture', slug: 'culture', type: 'evenement', couleur: '#7C5CBF', couleur_accent: '#E7DEF7', icon: 'i-lucide-drama' },
  { name: 'Nature', slug: 'nature', type: 'evenement', couleur: '#2E8B8B', couleur_accent: '#D2EFEF', icon: 'i-lucide-leaf' },
  { name: 'Solidarité', slug: 'solidarite', type: 'evenement', couleur: '#D9534F', couleur_accent: '#F7DDDC', icon: 'i-lucide-heart-handshake' },
  { name: 'Famille', slug: 'famille', type: 'evenement', couleur: '#E0913A', couleur_accent: '#F7E7CF', icon: 'i-lucide-users' },
]
const catId = {}
const CAT_RULES = [
  [/(hivernale|triathlon|vtt|course|marche|gym|lia|trail|petanque|pétanque|sport)/i, 'sport'],
  [/(plante|nature|jardin|forêt|foret)/i, 'nature'],
  [/(telethon|téléthon|solidarit|don)/i, 'solidarite'],
  [/(grenier|jouet|bourse|famille|jeux|noel|noël)/i, 'famille'],
  [/(theatre|théâtre|dessin|art|conference|conférence|lyrica|musique|djembe|baleine|spectacle|film|auteur|cirque|couture)/i, 'culture'],
]
function guessCat(...texts) {
  const t = norm(texts.join(' ')).toLowerCase()
  for (const [re, slug] of CAT_RULES) if (re.test(t)) return catId[slug] || null
  return null
}

async function seedCategories() {
  console.log('\n[categories]')
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i]
    catId[c.slug] = await upsert('categories', 'slug', c.slug, { ...c, sort: i + 1 })
    report.categories++
  }
  console.log(`  ${report.categories} catégories`)
}

// ---------- évènements + éditions ----------
const eventIdBySlug = {}

async function migrateEvenements() {
  console.log('\n[evenements + editions]')
  const base = join(CONTENT, 'evenements')
  for (const slug of readdirSync(base)) {
    const dir = join(base, slug)
    if (!statSync(dir).isDirectory()) continue
    const relDir = toForward(relative(ROOT, dir))
    const mdFiles = readdirSync(dir).filter((f) => f.endsWith('.md'))
    const indexFile = mdFiles.find((f) => f === 'index.md')
    const front = indexFile ? matter(readFileSync(join(dir, indexFile), 'utf8')) : null
    const title = front?.data?.title || humanize(slug)
    const pdf = readdirSync(dir).find((f) => f.toLowerCase().endsWith('.pdf'))

    const evId = await upsert('evenements', 'slug', slug, {
      status: 'published',
      title,
      description: front?.data?.description || '',
      image: front ? resolveMedia(relDir, front.data.preview) : null,
      reglement: pdf ? resolveMedia(relDir, pdf) : null,
      category: guessCat(slug, title, front?.data?.description),
      lieu_defaut: 'Larchant',
      legacy_path: relDir,
    })
    eventIdBySlug[slug] = evId
    report.evenements++

    for (const f of mdFiles) {
      const m = matter(readFileSync(join(dir, f), 'utf8'))
      const relFile = toForward(relative(ROOT, join(dir, f)))
      const suffix = f.match(/index(\d{2})?\.md$/)?.[1]
      let dStart = m.data.date ? String(new Date(m.data.date).toISOString().slice(0, 10)) : null
      if (dStart === '2023-01-01') dStart = null // date bidon de l'ancien site
      const annee = suffix ? 2000 + parseInt(suffix, 10) : (dStart ? new Date(dStart).getFullYear() : null)
      const isCurrent = !suffix // index.md = édition courante/à venir
      const body = (m.content || '').trim()
      const annule = /annul/i.test((m.data.title || '') + ' ' + body)
      await upsert('editions', 'legacy_path', relFile, {
        status: 'published',
        evenement: evId,
        annee,
        edition_label: annee ? `Édition ${annee}` : 'Édition en cours',
        date_start: dStart,
        affiche: resolveMedia(relDir, m.data.preview),
        content: rewriteBody(body, relDir),
        annule,
        sort: isCurrent ? -9999 : (annee ? -annee : 0), // édition courante en tête
      })
      report.editions++
    }
  }
  console.log(`  ${report.evenements} évènements, ${report.editions} éditions`)
}

// ---------- articles (posts + news) ----------
const articleIds = []
async function migrateArticles() {
  console.log('\n[articles]')
  for (const [sub, featured] of [['posts', false], ['news', true]]) {
    const dir = join(CONTENT, sub)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
      const m = matter(readFileSync(join(dir, f), 'utf8'))
      const relFile = toForward(relative(ROOT, join(dir, f)))
      const year = m.data.date ? new Date(m.data.date).getFullYear() : ''
      const slug = await uniqueSlug('articles', slugify(stripDate(f)), year, 'legacy_path', relFile)
      const title = m.data.title || humanize(stripDate(f))
      const id = await upsert('articles', 'legacy_path', relFile, {
        status: m.data.draft ? 'draft' : 'published',
        title,
        slug,
        date: m.data.date ? String(new Date(m.data.date).toISOString().slice(0, 10)) : null,
        description: m.data.summary || m.data.description || '',
        preview: resolveMedia(toForward(relative(ROOT, dir)), m.data.preview),
        content: rewriteBody((m.content || '').trim(), toForward(relative(ROOT, dir))),
        featured,
        category: guessCat(slug, title, m.data.tags),
      })
      articleIds.push({ id, slug, title })
      report.articles++
    }
  }
  console.log(`  ${report.articles} articles`)
}

// ---------- ateliers / activites ----------
async function migrateLeafDirs(sub, collection, counter) {
  console.log(`\n[${collection}]`)
  const base = join(CONTENT, sub)
  if (!existsSync(base)) return
  for (const slug of readdirSync(base)) {
    const dir = join(base, slug)
    if (!statSync(dir).isDirectory()) continue
    const idx = join(dir, 'index.md')
    if (!existsSync(idx)) continue
    const m = matter(readFileSync(idx, 'utf8'))
    const relDir = toForward(relative(ROOT, dir))
    const slg = slugify(slug)
    await upsert(collection, 'slug', slg, {
      status: m.data.draft ? 'draft' : 'published',
      title: m.data.title || humanize(slug),
      description: rewriteBody((m.content || '').trim(), relDir),
      image: resolveMedia(relDir, m.data.preview),
      category: guessCat(slug, m.data.title, m.data.description),
      actif: true,
      legacy_path: relDir,
    })
    report[counter]++
  }
  console.log(`  ${report[counter]} ${collection}`)
}

// ---------- newsletters ----------
async function migrateNewsletters() {
  console.log('\n[newsletters]')
  const dir = join(CONTENT, 'newsletter')
  if (!existsSync(dir)) return
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const m = matter(readFileSync(join(dir, f), 'utf8'))
    const relFile = toForward(relative(ROOT, join(dir, f)))
    const year = m.data.date ? new Date(m.data.date).getFullYear() : ''
    const slug = await uniqueSlug('newsletters', slugify(stripDate(f)), year, 'legacy_path', relFile)
    await upsert('newsletters', 'legacy_path', relFile, {
      status: 'published',
      title: m.data.title || humanize(stripDate(f)),
      slug,
      date: m.data.date ? String(new Date(m.data.date).toISOString().slice(0, 10)) : null,
      description: m.data.description || '',
      fichier: resolveMedia(toForward(relative(ROOT, dir)), m.data.preview),
    })
    report.newsletters++
  }
  console.log(`  ${report.newsletters} newsletters`)
}

// ---------- pages ----------
async function migratePages() {
  console.log('\n[pages]')
  const rootPages = ['about.md', 'contact.md', 'adherez.md']
  const dirPages = ['club-multisports', 'mediatheque']
  const entries = []
  for (const f of rootPages) if (existsSync(join(CONTENT, f))) entries.push([join(CONTENT, f), slugify(f.replace(/\.md$/, '')), CONTENT])
  for (const d of dirPages) {
    const idx = join(CONTENT, d, 'index.md')
    if (existsSync(idx)) entries.push([idx, slugify(d), join(CONTENT, d)])
  }
  for (const [file, slug, relBaseDir] of entries) {
    const m = matter(readFileSync(file, 'utf8'))
    const relDir = toForward(relative(ROOT, relBaseDir))
    await upsert('pages', 'slug', slug, {
      status: 'published',
      title: m.data.title || humanize(slug),
      content: rewriteBody((m.content || '').trim(), relDir),
      image: resolveMedia(relDir, m.data.preview),
      legacy_path: toForward(relative(ROOT, file)),
    })
    report.pages++
  }
  console.log(`  ${report.pages} pages`)
}

// ---------- maillage heuristique articles → évènements ----------
const EVENT_KEYWORDS = {
  hivernale: /hivernale/i,
  triathlon: /triathlon/i,
  'foire-aux-plantes': /(foire.*plante|plante|fap)/i,
  'vide-grenier': /(vide.?grenier|grenier|bourse|jouet)/i,
  telethon: /(telethon|téléthon)/i,
  lyricantrail: /lyrica/i,
  baleine: /baleine/i,
  conferences: /(conference|conférence|auteur|film|spectacle)/i,
}
async function linkArticles() {
  console.log('\n[maillage articles → évènements]')
  for (const art of articleIds) {
    const hay = norm(`${art.slug} ${art.title}`).toLowerCase()
    const matched = []
    for (const [slug, re] of Object.entries(EVENT_KEYWORDS)) {
      if (re.test(hay) && eventIdBySlug[slug]) matched.push(eventIdBySlug[slug])
    }
    for (const evId of matched) {
      // évite les doublons de jonction
      const exists = await api.get(`/items/articles_evenements?filter[articles_id][_eq]=${art.id}&filter[evenements_id][_eq]=${evId}&limit=1&fields=id`)
      if (exists?.length) continue
      await api.post('/items/articles_evenements', { articles_id: art.id, evenements_id: evId })
      report.links++
    }
  }
  console.log(`  ${report.links} liens créés`)
}

// ---------- singletons ----------
async function seedSingletons() {
  console.log('\n[singletons]')
  const logo = byRel.get('static/images/logo.png') || byBasename.get('logo.png') || null
  await api.patch('/items/site_parameters', {
    site_title: 'Larchant Animation',
    hero_title: 'Larchant Animation',
    hero_subtitle: 'La vie culturelle et sportive de Larchant, au pied de la forêt.',
    logo,
  })
  await api.patch('/items/infos_generales', {
    email: 'contact@larchantanimation.fr',
  })
  console.log(`  site_parameters (logo ${logo ? 'baleine ✓' : 'manquant'}), infos_generales`)
}

async function main() {
  console.log(`Migration → ${DIRECTUS_URL}`)
  await uploadMedia()
  await seedSingletons()
  await seedCategories()
  await migrateEvenements()
  await migrateArticles()
  await migrateLeafDirs('ateliers', 'ateliers', 'ateliers')
  await migrateLeafDirs('activites', 'activites', 'activites')
  await migrateNewsletters()
  await migratePages()
  await linkArticles()
  writeFileSync(join(__dirname, 'report.json'), JSON.stringify(report, null, 2))
  console.log('\n✅ Migration terminée.\n', JSON.stringify({ ...report, skipped: report.skipped.length }, null, 2))
}

main().catch((e) => { console.error('\n❌', e.stack || e.message); process.exit(1) })
