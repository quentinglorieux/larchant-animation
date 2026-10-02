// Création idempotente du schéma Directus pour Larchant Animation.
// Lancer : node migration/schema.mjs  (Directus doit tourner, cf docker compose up)
import {
  api, ensureCollection, ensureField, ensureRelation, collectionExists,
} from './lib/directus.mjs'

// --- Fabriques de champs ---
const pk = () => ({
  field: 'id', type: 'integer',
  meta: { hidden: true, interface: 'input', readonly: true },
  schema: { is_primary_key: true, has_auto_increment: true },
})

const status = () => ({
  field: 'status', type: 'string',
  meta: {
    interface: 'select-dropdown', display: 'labels', width: 'full', sort: 1,
    options: { choices: [
      { text: 'Publié', value: 'published' },
      { text: 'Brouillon', value: 'draft' },
      { text: 'Archivé', value: 'archived' },
    ] },
    display_options: { choices: [
      { text: 'Publié', value: 'published', color: '#2ECC71' },
      { text: 'Brouillon', value: 'draft', color: '#FFC23B' },
      { text: 'Archivé', value: 'archived', color: '#A2B5CD' },
    ] },
  },
  schema: { default_value: 'draft', is_nullable: false },
})

const str = (field, opts = {}) => ({
  field, type: 'string',
  meta: { interface: 'input', width: opts.width || 'full', required: !!opts.required, note: opts.note || null, hidden: !!opts.hidden },
  schema: { is_unique: !!opts.unique, is_nullable: !opts.required },
})

const text = (field, markdown = true) => ({
  field, type: 'text',
  meta: { interface: markdown ? 'input-rich-text-md' : 'input-multiline', width: 'full' },
  schema: {},
})

const int = (field, opts = {}) => ({
  field, type: 'integer',
  meta: { interface: 'input', width: opts.width || 'half', hidden: !!opts.hidden, required: !!opts.required, note: opts.note || null },
  schema: { is_nullable: !opts.required },
})

const bool = (field, def = false) => ({
  field, type: 'boolean',
  meta: { interface: 'boolean', width: 'half' },
  schema: { default_value: def },
})

const date = (field) => ({
  field, type: 'date',
  meta: { interface: 'datetime', width: 'half' },
  schema: {},
})

const color = (field) => ({
  field, type: 'string',
  meta: { interface: 'select-color', width: 'half' },
  schema: {},
})

const sortField = () => ({
  field: 'sort', type: 'integer',
  meta: { interface: 'input', hidden: true },
  schema: {},
})

const legacy = () => str('legacy_path', { hidden: true, note: 'Chemin du fichier markdown source (migration)' })

// Champ fichier (M2O directus_files) + sa relation
async function ensureFile(collection, field, { image = false } = {}) {
  await ensureField(collection, {
    field, type: 'uuid',
    meta: { interface: image ? 'file-image' : 'file', special: ['file'], width: 'half' },
    schema: {},
  })
  await ensureRelation({
    collection, field, related_collection: 'directus_files',
    schema: { on_delete: 'SET NULL' }, meta: {},
  })
}

// Champ M2O vers une collection interne + sa relation
async function ensureM2O(collection, field, related, { onDelete = 'SET NULL' } = {}) {
  await ensureField(collection, {
    field, type: 'integer',
    meta: { interface: 'select-dropdown-m2o', width: 'half', special: [] },
    schema: {},
  })
  await ensureRelation({
    collection, field, related_collection: related,
    schema: { on_delete: onDelete }, meta: {},
  })
}

// Relation M2M via collection de jonction
async function ensureM2M({ junction, colA, fieldA, aliasA, colB, fieldB, aliasB }) {
  // Collection de jonction (cachée)
  if (!(await collectionExists(junction))) {
    await api.post('/collections', {
      collection: junction,
      meta: { hidden: true, icon: 'import_export' },
      schema: {},
      fields: [pk()],
    })
    console.log(`  + collection ${junction}`)
  } else {
    console.log(`  = collection ${junction} (existe)`)
  }
  await ensureField(junction, int(fieldA, { hidden: true }))
  await ensureField(junction, int(fieldB, { hidden: true }))

  // Alias M2M de chaque côté
  await ensureField(colA, { field: aliasA, type: 'alias', meta: { interface: 'list-m2m', special: ['m2m'], width: 'full' } })
  await ensureField(colB, { field: aliasB, type: 'alias', meta: { interface: 'list-m2m', special: ['m2m'], width: 'full' } })

  // Relations de la jonction vers chaque côté
  await ensureRelation({
    collection: junction, field: fieldA, related_collection: colA,
    meta: { one_field: aliasA, junction_field: fieldB, sort_field: null },
    schema: { on_delete: 'CASCADE' },
  })
  await ensureRelation({
    collection: junction, field: fieldB, related_collection: colB,
    meta: { one_field: aliasB, junction_field: fieldA, sort_field: null },
    schema: { on_delete: 'CASCADE' },
  })
}

// Crée une collection de base (PK + champs) de façon idempotente
async function createCollection(name, meta, fields) {
  if (!(await collectionExists(name))) {
    await api.post('/collections', { collection: name, meta, schema: {}, fields: [pk()] })
    console.log(`  + collection ${name}`)
  } else {
    console.log(`  = collection ${name} (existe)`)
  }
  for (const f of fields) await ensureField(name, f)
}

async function main() {
  console.log(`Schéma Directus → ${process.env.DIRECTUS_PUBLIC_URL || 'localhost:18056'}`)

  // 1. categories (taxonomie + thématisation couleur)
  console.log('\n[categories]')
  await createCollection('categories',
    { icon: 'sell', note: 'Catégories (couleur + icône) partagées par les contenus', sort_field: 'sort' },
    [
      str('name', { required: true }),
      str('slug', { unique: true }),
      { field: 'type', type: 'string',
        meta: { interface: 'select-dropdown', width: 'half', options: { choices: [
          { text: 'Évènement', value: 'evenement' }, { text: 'Atelier', value: 'atelier' },
          { text: 'Activité', value: 'activite' }, { text: 'Article', value: 'article' },
        ] } }, schema: {} },
      color('couleur'), color('couleur_accent'),
      str('icon', { width: 'half', note: 'Identifiant Lucide, ex. i-lucide-bike' }),
      sortField(),
    ])

  // 2. evenements (parent — infos pérennes)
  console.log('\n[evenements]')
  await createCollection('evenements',
    { icon: 'celebration', note: 'Évènement récurrent (infos générales pérennes)',
      sort_field: 'sort', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      text('description'),
      str('lieu_defaut', { note: 'Lieu habituel' }),
      str('recurrence', { note: 'Ex. « chaque 2ᵉ dimanche de mars »' }),
      color('couleur'), color('couleur_accent'),
      bool('featured'), sortField(), legacy(),
    ])
  await ensureM2O('evenements', 'category', 'categories')
  await ensureFile('evenements', 'image', { image: true })
  await ensureFile('evenements', 'reglement')

  // 3. editions (enfant — une instance par an)
  console.log('\n[editions]')
  await createCollection('editions',
    { icon: 'event', note: 'Édition d’un évènement (une par année)',
      archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), int('annee', { required: true }), str('edition_label', { note: 'Ex. « Édition 2026 »' }),
      date('date_start'), date('date_end'),
      str('lieu', { note: 'Si différent du lieu habituel' }),
      text('content'), text('resultats'),
      str('inscription_url'), bool('annule'),
      legacy(),
    ])
  await ensureM2O('editions', 'evenement', 'evenements', { onDelete: 'CASCADE' })
  await ensureFile('editions', 'affiche', { image: true })
  await ensureFile('editions', 'inscription_pdf')

  // 4. articles (blog / actualités)
  console.log('\n[articles]')
  await createCollection('articles',
    { icon: 'article', note: 'Articles de blog / actualités',
      sort_field: 'sort', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      date('date'), str('description'), text('content'),
      bool('featured'), sortField(), legacy(),
    ])
  await ensureM2O('articles', 'category', 'categories')
  await ensureFile('articles', 'preview', { image: true })

  // 5. ateliers (cours encadrés hebdomadaires)
  console.log('\n[ateliers]')
  await createCollection('ateliers',
    { icon: 'school', note: 'Ateliers / cours encadrés',
      sort_field: 'sort', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      text('description'),
      str('animateur', { width: 'half' }), str('horaires', { width: 'half' }),
      str('lieu', { width: 'half' }), str('salle', { width: 'half' }),
      str('tarif', { width: 'half' }), str('contact', { width: 'half' }),
      bool('actif', true), sortField(), legacy(),
    ])
  await ensureM2O('ateliers', 'category', 'categories')
  await ensureFile('ateliers', 'image', { image: true })

  // 6. activites (activités libres)
  console.log('\n[activites]')
  await createCollection('activites',
    { icon: 'directions_run', note: 'Activités libres / gratuites',
      sort_field: 'sort', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      text('description'),
      str('animateur', { width: 'half' }), str('horaires', { width: 'half' }),
      str('lieu', { width: 'half' }), str('salle', { width: 'half' }),
      str('contact', { width: 'half' }),
      bool('actif', true), sortField(), legacy(),
    ])
  await ensureM2O('activites', 'category', 'categories')
  await ensureFile('activites', 'image', { image: true })

  // 7. newsletters
  console.log('\n[newsletters]')
  await createCollection('newsletters',
    { icon: 'mail', note: 'Newsletters (PDF)', sort_field: 'sort',
      archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      date('date'), int('numero'), str('description'), sortField(), legacy(),
    ])
  await ensureFile('newsletters', 'fichier')

  // 8. pages (about, adherer, mediatheque, savanturiers…)
  console.log('\n[pages]')
  await createCollection('pages',
    { icon: 'description', note: 'Pages éditoriales', sort_field: 'sort',
      archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft' },
    [
      status(), str('title', { required: true }), str('slug', { unique: true }),
      text('content'), sortField(), legacy(),
    ])
  await ensureFile('pages', 'image', { image: true })

  // 9. Singletons
  console.log('\n[site_parameters] (singleton)')
  await createCollection('site_parameters',
    { icon: 'settings', singleton: true, note: 'Paramètres globaux du site' },
    [
      str('site_title'), str('hero_title'), text('hero_subtitle', false),
      str('facebook_url'), str('instagram_url'), str('youtube_url'),
      str('devise'), str('bandeau_texte'), str('bandeau_lien'),
      str('asso_titre'), text('asso_texte'), text('ateliers_texte'), text('newsletter_texte'),
    ])
  await ensureFile('site_parameters', 'logo', { image: true })
  await ensureFile('site_parameters', 'logo_dark', { image: true })
  await ensureFile('site_parameters', 'hero_image', { image: true })
  await ensureFile('site_parameters', 'asso_image', { image: true })

  console.log('\n[infos_generales] (singleton)')
  await createCollection('infos_generales',
    { icon: 'info', singleton: true, note: 'Coordonnées & infos pratiques de l’association' },
    [
      text('adresse', false), str('email'), str('telephone'),
      text('horaires', false), str('president'),
      text('adhesion'), str('helloasso_url'), text('mentions_legales'),
    ])

  console.log('\n[accueil_slides]')
  await createCollection('accueil_slides',
    { icon: 'view_carousel', note: 'Carrousel de la page d’accueil', sort_field: 'sort' },
    [str('title'), str('lien'), sortField()])
  await ensureFile('accueil_slides', 'image', { image: true })

  // 10. Maillage M2M
  console.log('\n[maillage M2M]')
  await ensureM2M({
    junction: 'articles_evenements',
    colA: 'articles', fieldA: 'articles_id', aliasA: 'evenements_lies',
    colB: 'evenements', fieldB: 'evenements_id', aliasB: 'articles_lies',
  })
  await ensureM2M({
    junction: 'articles_editions',
    colA: 'articles', fieldA: 'articles_id', aliasA: 'editions_liees',
    colB: 'editions', fieldB: 'editions_id', aliasB: 'articles_lies',
  })

  console.log('\n✅ Schéma appliqué.')
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
