// Migration one-shot du contenu Hugo (markdown) → Directus.
// Idempotent : ré-exécutable sans créer de doublons (upsert par slug / legacy_path).
// Lancer : node migration/migrate.mjs   (Directus doit tourner + schéma appliqué)
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join, relative, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import * as yaml from 'js-yaml'
import { api, DIRECTUS_URL } from './lib/directus.mjs'
import { slugify, stripDate, rewriteBody as rewrite, extractInscription, editionYear, mimeFor } from './lib/content.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CONTENT = join(ROOT, 'content')
const STATIC = join(ROOT, 'static')

const MEDIA_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.avif', '.gpx'])
const OVERRIDES_FILE = join(__dirname, 'editions-overrides.json')
const OVERRIDES = existsSync(OVERRIDES_FILE) ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')) : {}
const editionLinks = []
const report = { files: 0, categories: 0, evenements: 0, editions: 0, articles: 0, ateliers: 0, activites: 0, newsletters: 0, pages: 0, links: 0, skipped: [] }

// ---------- utilitaires ----------
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
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

  const dirs = [join(ROOT, 'assets', 'gpx'), join(STATIC, 'images'), join(STATIC, 'files'), CONTENT]
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
        const mime = mimeFor(full)
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

const rewriteBody = (body, relDir) => rewrite(body, (url) => resolveMedia(relDir, url))

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
      const o = OVERRIDES[relFile] || {}
      const rawDate = m.data.date ? new Date(m.data.date).toISOString().slice(0, 10) : null
      const dStart = 'date_start' in o ? o.date_start : (rawDate === '2023-01-01' ? null : rawDate)
      const annee = o.annee ?? editionYear(f, rawDate) ?? new Date().getFullYear()
      const { body, inscriptionUrl } = extractInscription((m.content || '').trim())
      const editionId = await upsert('editions', 'legacy_path', relFile, {
        status: 'published',
        evenement: evId,
        annee,
        edition_label: o.edition_label || `Édition ${annee}`,
        date_start: dStart,
        date_end: o.date_end ?? null,
        affiche: resolveMedia(relDir, m.data.preview),
        content: rewriteBody(body, relDir),
        inscription_url: o.inscription_url ?? inscriptionUrl,
        annule: o.annule ?? /annul/i.test(`${m.data.title || ''} ${body}`),
        resultats: o.resultats ?? null,
      })
      editionLinks.push({ editionId, articles: o.articles || [] })
      report.editions++
    }
  }
  console.log(`  ${report.evenements} évènements, ${report.editions} éditions`)
}

// Éditions connues uniquement par des articles (clé "_extra" des overrides)
async function migrateExtraEditions() {
  console.log('\n[éditions issues d articles]')
  let n = 0
  for (const x of OVERRIDES._extra || []) {
    const evId = eventIdBySlug[x.evenement]
    if (!evId) { report.skipped.push(`évènement inconnu pour édition extra : ${x.evenement} ${x.annee}`); continue }
    const relDir = toForward(dirname(x.affiche || '')) 
    const editionId = await upsert('editions', 'legacy_path', `extra:${x.evenement}:${x.annee}`, {
      status: 'published',
      evenement: evId,
      annee: x.annee,
      edition_label: x.edition_label || `Édition ${x.annee}`,
      date_start: x.date_start ?? null,
      date_end: x.date_end ?? null,
      affiche: x.affiche ? (byRel.get(x.affiche) ?? resolveMedia(relDir, x.affiche)) : null,
      content: x.content ?? null,
      annule: x.annule ?? false,
    })
    editionLinks.push({ editionId, articles: x.articles || [] })
    report.editions++
    n++
  }
  console.log(`  ${n} éditions extra`)
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
  const rootPages = ['about.md', 'contact.md', 'adherez.md', 'inscriptions.md', 'merci.md']
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
      content: slug === 'contact' ? 'Vous souhaitez prendre contact avec nous pour vous informer ou nous rejoindre.' : rewriteBody((m.content || '').trim(), relDir),
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
  for (const { editionId, articles } of editionLinks) {
    for (const legacy of articles) {
      const artId = await findId('articles', 'legacy_path', legacy)
      if (!artId) { report.skipped.push(`article introuvable pour édition : ${legacy}`); continue }
      const exists = await api.get(`/items/articles_editions?filter[articles_id][_eq]=${artId}&filter[editions_id][_eq]=${editionId}&limit=1&fields=id`)
      if (!exists?.length) { await api.post('/items/articles_editions', { articles_id: artId, editions_id: editionId }); report.links++ }
    }
  }
  console.log(`  ${report.links} liens créés`)
}

// ---------- singletons ----------
async function seedSingletons() {
  console.log('\n[singletons]')
  const settings = yaml.load(readFileSync(join(ROOT, 'data/settings.yml'), 'utf8'))
  const carousel = yaml.load(readFileSync(join(ROOT, 'data/carousel.yml'), 'utf8'))
  const paras = (b) => (b?.content || []).map((c) => c.text).join('\n\n')
  const logo = byRel.get('static/images/logo.png') || byBasename.get('logo.png') || null
  await api.patch('/items/site_parameters', {
    site_title: 'Larchant Animation',
    hero_title: 'Larchant Animation',
    hero_subtitle: settings.description?.trim() || null,
    devise: settings.moto || null,
    asso_titre: settings.paragraph1?.heading || null,
    asso_texte: paras(settings.paragraph1),
    asso_image: resolveMedia('static', settings.paragraph1?.image),
    ateliers_texte: paras(settings.ateliers),
    newsletter_texte: paras(settings.mailinglist),
    bandeau_texte: 'Inscriptions aux ateliers 2026-2027',
    bandeau_lien: '/inscriptions',
    facebook_url: settings.social_media?.facebook?.url || null,
    logo,
  })
  await api.patch('/items/infos_generales', { email: 'contact@larchantanimation.fr' })
  for (const [i, s] of (carousel.images || []).entries()) {
    const existing = await api.get(`/items/accueil_slides?filter[sort][_eq]=${i + 1}&limit=1&fields=id`)
    const payload = { title: s.title || null, image: resolveMedia('static', s.image), lien: null, sort: i + 1 }
    if (existing?.length) await api.patch(`/items/accueil_slides/${existing[0].id}`, payload)
    else await api.post('/items/accueil_slides', payload)
  }
  console.log(`  site_parameters, infos_generales, ${carousel.images?.length || 0} slides`)
}

async function main() {
  console.log(`Migration → ${DIRECTUS_URL}`)
  await uploadMedia()
  await seedSingletons()
  await seedCategories()
  await migrateEvenements()
  await migrateExtraEditions()
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
