# Migration Directus + Nuxt : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en ligne sur `beta.larchantanimation.fr` la refonte Directus + Nuxt, éditable par des bénévoles via le Studio, avec toutes les éditions passées des évènements archivées et consultables.

**Architecture:** Directus 11 + Postgres 16 (Docker) sert l'API ; `site/` (Nuxt 4 SSR) lit Directus à chaque requête avec un cache SWR de 60 s ; `studio/` (Nuxt SPA) est l'interface d'édition et parle à Directus via un proxy Nitro. Les scripts `migration/` créent le schéma et les rôles, puis importent le contenu Hugo de `content/`.

**Tech Stack:** Directus 11, Postgres 16, Nuxt 4.4, Nuxt UI 4, `@directus/sdk` 19, markdown-it 14, CodeMirror 6, Vitest 3, `node:test`, PM2, nginx, certbot, CLI `ovhcloud`.

**Spec:** `docs/superpowers/specs/2026-10-02-migration-directus-design.md`

## Global Constraints

- Jamais de tiret cadratin (U+2014) dans le code, les commentaires, les textes ou les commits.
- Tous les textes visibles en français avec accents corrects.
- Ports : site `13010`, Studio `13011`, Directus `127.0.0.1:18056`, Postgres `127.0.0.1:54322`.
- Domaines : `beta.larchantanimation.fr` (site), `studio.larchantanimation.fr`, `api.larchantanimation.fr`. `larchantanimation.fr` reste sur Netlify, intouché.
- VPS : `ssh hostinger-KVM` (109.176.199.51, root), dépôt dans `/root/larchant-animation`. IMAP occupe déjà 13000/13001/18055/54321 : ne pas y toucher.
- DNS : `~/.local/bin/ovhcloud`, toujours `< /dev/null`, lister avant de modifier, **montrer la commande exacte et attendre la confirmation de Quentin avant toute création/modification/suppression**.
- Formulaires : POST vers `https://script.google.com/macros/s/AKfycbxTJwyga8hOEfVUfCIaMFl0QfnqmLoxAsra4XXpp9SebNJyQpVnkHS7lciGBhaDvxDKfg/exec`, champ `t=larchant-2026`, piège `bot-field` vide, succès si la réponse texte vaut `ok`.
- Médias dans le markdown stocké : chemin relatif `/assets/<uuid>`, jamais d'URL absolue Directus.
- Un seul rôle non admin : `Éditeur`.
- Node 22 en local et sur le VPS.

## Review Focus

1. **Édition sans date** (2024/2025 importées, ou édition annoncée sans date) : la page évènement ne plante pas, affiche « Date à venir », et le choix de l'édition en cours reste déterministe. Test : Task 2, cas « sans date ».
2. **Deux éditions la même année pour un évènement** : le Studio refuse avec un message clair au lieu de créer un doublon qui casserait `/evenements/<slug>/<annee>`. Test : Task 3, `findDuplicateYear`.
3. **Ancienne URL avec accents ou majuscules** (`/posts/2024-06-08-Pétanque/`, `/ateliers/Djembe`) : 301 vers la bonne page, jamais 404. Test : Task 4, `hugoUrlize`, et Task 16.
4. **Image collée dans l'éditeur alors que l'upload échoue** (session expirée, fichier trop gros) : un message d'erreur s'affiche et le texte saisi est conservé. Test : Task 11, `insertUploadedImage`.
5. **Suppression d'une édition passée ou d'un évènement qui a des éditions** : bloquée avec une explication. Test : Task 3, `deleteBlockReason`.

---

## Structure des fichiers

```
migration/
  lib/content.mjs (+ .test.mjs)  NOUVEAU  fonctions pures : slug, rewriteBody, extractInscription, editionYear, hugoUrlize, mimeFor
  schema.mjs                     MODIFIÉ  editions sans sort + annee requis, site_parameters (accueil), accueil_slides
  permissions.mjs                MODIFIÉ  + rôle et policy Éditeur
  migrate.mjs                    MODIFIÉ  lib/content, gpx, pages inscriptions/merci, accueil, overrides
  editions-overrides.json        NOUVEAU  corrections 2024/2025 (données)
  review.mjs                     NOUVEAU  génère editions-review.md
  redirects.mjs, redirects-manual.json   NOUVEAU  génère site/redirects.json depuis le sitemap live
  verify.mjs                     NOUVEAU  vérification post-migration
site/
  vitest.config.ts               NOUVEAU
  nuxt.config.ts                 MODIFIÉ  proxy /assets, SWR, redirections, gasFormUrl, port 13010
  redirects.json                 GÉNÉRÉ
  public/classement/, public/classement_general/, public/*.json   COPIÉS depuis Hugo
  app/utils/editions.ts (+ .test.ts)   MODIFIÉ
  app/utils/gasForm.ts (+ .test.ts)    NOUVEAU
  app/components/ContactForm.vue, NewsletterForm.vue, HomeCarousel.vue   NOUVEAUX
  app/pages/evenements/[slug].vue, [slug]/[annee].vue, index.vue, [slug].vue   MODIFIÉS
  app/layouts/default.vue, app/types.ts   MODIFIÉS
  app/error.vue, server/routes/sitemap.xml.ts   NOUVEAUX
studio/
  vitest.config.ts               NOUVEAU
  nuxt.config.ts                 MODIFIÉ  proxy /assets, siteUrl, port 13011
  app/types/resource.ts          NOUVEAU  FieldDef, ColumnDef
  app/utils/editions.ts (+ .test.ts)        NOUVEAU
  app/utils/markdownFormat.ts (+ .test.ts)  NOUVEAU
  app/composables/useMarkdownRender.ts, useEditionConfig.ts   NOUVEAUX
  app/components/MarkdownEditor.vue, ResourceForm.vue   NOUVEAUX
  app/components/ResourceManager.vue   MODIFIÉ
  app/pages/evenements/index.vue (déplacé), evenements/[id].vue, accueil.vue, comptes.vue
  app/pages/index.vue, editions.vue, articles.vue, ateliers.vue, activites.vue, pages.vue, newsletters.vue, categories.vue, settings.vue
  app/layouts/default.vue, app/composables/useDirectusAuth.js
deploy/nginx/larchant.conf, deploy/backup.sh   NOUVEAUX
ecosystem.config.cjs, docker-compose.yml, .env.example, .gitignore   MODIFIÉS
```

---

### Task 0 : Versionner la refonte existante

`site/`, `studio/`, `migration/`, `directus/` ne sont pas suivis : il faut les commiter pour déployer par git.

**Files:** Modify `.gitignore`

- [ ] **Step 1 : `.gitignore`** : remplacer `public/` par `/public/` (sinon `site/public/` serait ignoré) et `package-lock.json` par `/package-lock.json` (les lockfiles de `site/`, `studio/`, `migration/` doivent être suivis pour `npm ci`). Ajouter à la fin :
```
nuxt/
directus/database/
```
- [ ] **Step 2 : Aucun secret suivi**
Run: `git check-ignore .env && git status --porcelain | grep -v '^??' ; grep -rnE "PASSWORD=[^$ ]|SECRET=[^$ ]" docker-compose.yml site/nuxt.config.ts studio/nuxt.config.ts migration/*.mjs || echo "aucun secret"`
Expected: `.env` ignoré, « aucun secret ».
- [ ] **Step 3 : Commit**
```bash
git add .gitignore .env.example README-refonte.md docker-compose.yml ecosystem.config.cjs directus/snapshot.yml migration site studio
git status --short | grep -E "node_modules|\.output|\.nuxt" && echo "STOP: artefacts suivis" || true
git commit -m "Refonte : backend Directus, site Nuxt et Studio"
```

---

### Task 1 : Schéma et rôle Éditeur

**Files:** Modify `migration/schema.mjs`, `migration/permissions.mjs`, `directus/snapshot.yml`

**Interfaces:**
- Produces : collection `accueil_slides` (`id`, `title`, `lien`, `image` uuid, `sort`) ; champs `site_parameters.{devise, bandeau_texte, bandeau_lien, asso_titre, asso_texte, asso_image, ateliers_texte, newsletter_texte}` ; `editions` sans `sort`, avec `annee` obligatoire ; rôle et policy Directus `Éditeur`.

- [ ] **Step 1 : Directus local sur base vierge** (l'import de juin est rejouable)
```bash
docker compose down -v && docker compose up -d
until curl -sf http://127.0.0.1:18056/server/health; do sleep 2; done
```
Expected: `{"status":"ok"}`

- [ ] **Step 2 : `schema.mjs`**

`int()` accepte `required` :
```js
const int = (field, opts = {}) => ({
  field, type: 'integer',
  meta: { interface: 'input', width: opts.width || 'half', hidden: !!opts.hidden, required: !!opts.required, note: opts.note || null },
  schema: { is_nullable: !opts.required },
})
```
Bloc `editions` (plus de `sort_field` ni `sortField()`) :
```js
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
```
Singleton `site_parameters`, après `str('youtube_url')` :
```js
      str('devise'), str('bandeau_texte'), str('bandeau_lien'),
      str('asso_titre'), text('asso_texte'), text('ateliers_texte'), text('newsletter_texte'),
```
puis, après ses `ensureFile` : `await ensureFile('site_parameters', 'asso_image', { image: true })`.
Avant le maillage M2M :
```js
  console.log('\n[accueil_slides]')
  await createCollection('accueil_slides',
    { icon: 'view_carousel', note: 'Carrousel de la page d’accueil', sort_field: 'sort' },
    [str('title'), str('lien'), sortField()])
  await ensureFile('accueil_slides', 'image', { image: true })
```

- [ ] **Step 3 : `permissions.mjs`** : ajouter `'accueil_slides'` à `OPEN`, puis :
```js
const CONTENT = [...WITH_STATUS, 'categories', 'accueil_slides', 'articles_evenements', 'articles_editions']
const SINGLETONS = ['site_parameters', 'infos_generales']

async function ensurePerm(policy, collection, action, permissions = {}, fields = ['*']) {
  const existing = await api.get(
    `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${collection}&filter[action][_eq]=${action}&limit=1&fields=id`
  )
  const payload = { policy, collection, action, fields, permissions }
  if (existing?.length) await api.patch(`/permissions/${existing[0].id}`, payload)
  else await api.post('/permissions', payload)
}

async function ensureEditorRole() {
  let [policy] = await api.get(`/policies?filter[name][_eq]=${encodeURIComponent('Éditeur')}&fields=id`)
  if (!policy) policy = await api.post('/policies', { name: 'Éditeur', icon: 'edit', admin_access: false, app_access: false })
  let [role] = await api.get(`/roles?filter[name][_eq]=${encodeURIComponent('Éditeur')}&fields=id`)
  if (!role) role = await api.post('/roles', { name: 'Éditeur', icon: 'edit', policies: { create: [{ policy: policy.id }] } })
  for (const c of CONTENT) for (const a of ['create', 'read', 'update', 'delete']) await ensurePerm(policy.id, c, a)
  for (const c of SINGLETONS) for (const a of ['read', 'update']) await ensurePerm(policy.id, c, a)
  for (const a of ['create', 'read', 'update', 'delete']) await ensurePerm(policy.id, 'directus_files', a)
  await ensurePerm(policy.id, 'directus_folders', 'read')
  await ensurePerm(policy.id, 'directus_users', 'read', { id: { _eq: '$CURRENT_USER' } }, ['id', 'first_name', 'last_name', 'email', 'avatar'])
  console.log(`  Éditeur : role ${role.id}, policy ${policy.id}`)
}
```
Appeler `await ensureEditorRole()` à la fin de `main()`.

- [ ] **Step 4 : Appliquer**
```bash
cd migration && npm install && npm run schema && npm run permissions
```
Puis, avec un token admin : `GET /roles?fields=name,policies.policy.name` doit contenir `Éditeur` lié à la policy `Éditeur`. Si la création imbriquée `policies.create` est refusée par cette version, créer le rôle sans `policies` puis `POST /access` avec `{ role, policy }`, et revérifier.

- [ ] **Step 5 : Test du rôle** : créer un utilisateur test du rôle Éditeur (`POST /users`) et se connecter avec. Attendu : `GET /items/evenements` → 200, `POST /items/articles` → 200, `GET /roles` → 403, `GET /users/me` → 200. Supprimer l'utilisateur test.

- [ ] **Step 6 : Snapshot et commit**
```bash
docker compose exec -T directus npx directus schema snapshot --yes /directus/uploads/snapshot.yml && mv directus/uploads/snapshot.yml directus/snapshot.yml
git add migration/schema.mjs migration/permissions.mjs directus/snapshot.yml
git commit -m "Schéma : éditions par année, accueil éditable, rôle Éditeur"
```

---

### Task 2 : Logique des éditions côté site (TDD)

**Files:** Create `site/vitest.config.ts`, `site/app/utils/editions.test.ts` ; Modify `site/app/utils/editions.ts`, `site/app/types.ts`, `site/package.json`

**Interfaces:**
- Produces :
  - `currentEdition(editions: Edition[], now?: number): Edition | null`
  - `pastEditions(editions: Edition[], current: Edition | null): Edition[]`
  - `isFinished(e: Edition, now?: number): boolean`
  - `adjacentEditions(editions: Edition[], e: Edition): { prev: Edition | null, next: Edition | null }`
  - `formatDate`, `formatMonth` inchangés.

- [ ] **Step 1 : Vitest** : `cd site && npm i -D vitest@^3` ; script `"test": "vitest run"` ; `site/vitest.config.ts` :
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  test: { include: ['app/**/*.test.ts'] }
})
```
Dans `types.ts`, retirer `sort?: number` de `Edition`.

- [ ] **Step 2 : Tests** `site/app/utils/editions.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import type { Edition } from '~/types'
import { currentEdition, pastEditions, isFinished, adjacentEditions } from './editions'

const ed = (id: number, annee: number, date_start: string | null = null, extra: Partial<Edition> = {}): Edition =>
  ({ id, status: 'published', annee, edition_label: `Édition ${annee}`, date_start, date_end: null, ...extra })
const NOW = new Date('2026-10-02T12:00:00Z').getTime()

describe('currentEdition', () => {
  it('retourne null sans édition', () => expect(currentEdition([], NOW)).toBeNull())

  it('choisit l’édition à venir la plus proche', () => {
    const list = [ed(1, 2025, '2025-03-09'), ed(2, 2027, '2027-03-14'), ed(3, 2026, '2026-10-11')]
    expect(currentEdition(list, NOW)?.id).toBe(3)
  })

  it('garde une édition dont la date de fin n’est pas passée', () => {
    expect(currentEdition([ed(1, 2026, '2026-09-30', { date_end: '2026-10-03' })], NOW)?.id).toBe(1)
  })

  it('garde l’édition du jour jusqu’à minuit', () => {
    expect(isFinished(ed(1, 2026, '2026-10-02'), NOW)).toBe(false)
  })

  it('sinon retient la plus récente, terminée', () => {
    const list = [ed(1, 2024, null), ed(2, 2026, '2026-03-08'), ed(3, 2025, '2025-03-09')]
    expect(currentEdition(list, NOW)?.id).toBe(2)
  })

  it('sans date : une édition annoncée pour une année future passe devant une édition passée', () => {
    expect(currentEdition([ed(1, 2026, '2026-03-08'), ed(2, 2027, null)], NOW)?.id).toBe(2)
  })

  it('une édition annulée peut être l’édition en cours', () => {
    expect(currentEdition([ed(1, 2025, '2025-03-09'), ed(2, 2026, '2026-11-08', { annule: true })], NOW)?.id).toBe(2)
  })
})

describe('pastEditions', () => {
  it('exclut l’édition en cours et trie par année décroissante', () => {
    const list = [ed(1, 2024), ed(2, 2026, '2026-10-11'), ed(3, 2025)]
    expect(pastEditions(list, currentEdition(list, NOW)).map(e => e.id)).toEqual([3, 1])
  })
})

describe('isFinished', () => {
  it('sans date : terminée si l’année est passée', () => {
    expect(isFinished(ed(1, 2025), NOW)).toBe(true)
    expect(isFinished(ed(1, 2026), NOW)).toBe(false)
  })
})

describe('adjacentEditions', () => {
  it('donne les éditions voisines par année', () => {
    const list = [ed(1, 2024), ed(2, 2025), ed(3, 2026)]
    const { prev, next } = adjacentEditions(list, list[1]!)
    expect([prev?.id, next?.id]).toEqual([1, 3])
  })
  it('renvoie null aux extrémités', () => {
    const list = [ed(1, 2024), ed(2, 2025)]
    expect(adjacentEditions(list, list[0]!).prev).toBeNull()
    expect(adjacentEditions(list, list[1]!).next).toBeNull()
  })
})
```

- [ ] **Step 3 : Lancer** `npm test` → FAIL (`isFinished`, `adjacentEditions` absents ; cas « annoncée sans date » faux).

- [ ] **Step 4 : Implémenter** : remplacer dans `site/app/utils/editions.ts` tout ce qui précède `const FR_DATE` par :
```ts
import type { Edition } from '~/types'

const DAY = 86_400_000

/** Fin de l'édition (minuit après date_end, sinon après date_start), ou null si non datée. */
function endTime(e: Edition): number | null {
  const d = e.date_end || e.date_start
  return d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime() + DAY : null
}

const byRecency = (a: Edition, b: Edition) =>
  (b.annee ?? 0) - (a.annee ?? 0) || (b.date_start ?? '').localeCompare(a.date_start ?? '')

/** Terminée si sa date est passée ou, sans date, si son année est passée. */
export function isFinished(e: Edition, now = Date.now()): boolean {
  const end = endTime(e)
  if (end !== null) return end <= now
  return (e.annee ?? 0) < new Date(now).getUTCFullYear()
}

/** Édition mise en avant : la prochaine édition datée non terminée, sinon la plus récente. */
export function currentEdition(editions: Edition[] = [], now = Date.now()): Edition | null {
  if (!editions.length) return null
  const upcoming = editions
    .filter(e => e.date_start && !isFinished(e, now))
    .sort((a, b) => (a.date_start as string).localeCompare(b.date_start as string))
  return upcoming[0] ?? [...editions].sort(byRecency)[0]!
}

/** Les autres éditions (archives), de la plus récente à la plus ancienne. */
export function pastEditions(editions: Edition[] = [], current: Edition | null): Edition[] {
  return editions.filter(e => e.id !== current?.id).sort(byRecency)
}

/** Éditions voisines par année, pour naviguer entre archives. */
export function adjacentEditions(editions: Edition[], e: Edition): { prev: Edition | null, next: Edition | null } {
  const sorted = [...editions].sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0))
  const i = sorted.findIndex(x => x.id === e.id)
  return { prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null }
}

```

- [ ] **Step 5 : Lancer** `npm test` → PASS (11 tests).

- [ ] **Step 6 : Commit**
```bash
git add site/vitest.config.ts site/package.json site/package-lock.json site/app/utils/editions.ts site/app/utils/editions.test.ts site/app/types.ts
git commit -m "Site : édition en cours et archives fondées sur les dates"
```

---

### Task 3 : Règles des éditions côté Studio (TDD)

**Files:** Create `studio/vitest.config.ts`, `studio/app/utils/editions.ts`, `studio/app/utils/editions.test.ts` ; Modify `studio/package.json`

**Interfaces:**
- Produces :
  - `type EditionRow = { id?: number, evenement: number, annee: number | null, date_start: string | null, date_end: string | null, status?: string, edition_label?: string | null, lieu?: string | null, content?: string | null, [k: string]: unknown }`
  - `nextEditionDraft(last: EditionRow | null, evenementId: number, now?: number): EditionRow`
  - `isPastEdition(e: Pick<EditionRow, 'annee' | 'date_start' | 'date_end'>, now?: number): boolean`
  - `findDuplicateYear(rows: EditionRow[], candidate: EditionRow): EditionRow | null`
  - `deleteBlockReason(collection: string, row: Record<string, unknown>, ctx?: { editionsCount?: number, now?: number }): string | null`

- [ ] **Step 1 : Vitest** : `cd studio && npm i -D vitest@^3`, script `"test": "vitest run"`, `studio/vitest.config.ts` identique à `site/vitest.config.ts` (Task 2, Step 1).

- [ ] **Step 2 : Tests** `studio/app/utils/editions.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { nextEditionDraft, isPastEdition, findDuplicateYear, deleteBlockReason } from './editions'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()
const last = { id: 7, evenement: 3, annee: 2026, date_start: '2026-03-08', date_end: null, status: 'published',
  edition_label: 'Édition 2026', lieu: 'Gymnase', content: '## Programme', affiche: 'uuid-a',
  inscription_url: 'https://x', inscription_pdf: 'uuid-b', resultats: 'Bilan', annule: true }

describe('nextEditionDraft', () => {
  it('crée un brouillon de l’année suivante qui reprend lieu et programme', () => {
    expect(nextEditionDraft(last, 3, NOW)).toMatchObject({ evenement: 3, annee: 2027, edition_label: 'Édition 2027', status: 'draft', lieu: 'Gymnase', content: '## Programme' })
  })
  it('vide ce qui est propre à une année', () => {
    const d = nextEditionDraft(last, 3, NOW)
    expect(d).toMatchObject({ date_start: null, date_end: null, affiche: null, inscription_url: null, inscription_pdf: null, resultats: null, annule: false })
    expect(d.id).toBeUndefined()
  })
  it('sans édition précédente, part de l’année courante', () => {
    expect(nextEditionDraft(null, 3, NOW).annee).toBe(2026)
  })
  it('après une longue interruption, propose l’année courante', () => {
    expect(nextEditionDraft({ ...last, annee: 2023 }, 3, NOW).annee).toBe(2026)
  })
})

describe('isPastEdition', () => {
  it('datée : passée après le dernier jour', () => {
    expect(isPastEdition({ annee: 2026, date_start: '2026-10-01', date_end: null }, NOW)).toBe(true)
    expect(isPastEdition({ annee: 2026, date_start: '2026-10-02', date_end: null }, NOW)).toBe(false)
  })
  it('sans date : passée si l’année est passée', () => {
    expect(isPastEdition({ annee: 2025, date_start: null, date_end: null }, NOW)).toBe(true)
    expect(isPastEdition({ annee: 2026, date_start: null, date_end: null }, NOW)).toBe(false)
  })
})

describe('findDuplicateYear', () => {
  const rows = [{ id: 1, evenement: 3, annee: 2025, date_start: null, date_end: null }]
  it('détecte une autre édition du même évènement la même année', () => {
    expect(findDuplicateYear(rows, { evenement: 3, annee: 2025, date_start: null, date_end: null })?.id).toBe(1)
  })
  it('ignore la fiche elle-même et les autres évènements', () => {
    expect(findDuplicateYear(rows, { id: 1, evenement: 3, annee: 2025, date_start: null, date_end: null })).toBeNull()
    expect(findDuplicateYear(rows, { evenement: 4, annee: 2025, date_start: null, date_end: null })).toBeNull()
  })
})

describe('deleteBlockReason', () => {
  it('bloque une édition passée', () => {
    expect(deleteBlockReason('editions', { annee: 2024, date_start: null, date_end: null }, { now: NOW })).toMatch(/archives/)
  })
  it('autorise un brouillon futur', () => {
    expect(deleteBlockReason('editions', { annee: 2027, date_start: null, date_end: null }, { now: NOW })).toBeNull()
  })
  it('bloque un évènement qui a des éditions', () => {
    expect(deleteBlockReason('evenements', {}, { editionsCount: 2 })).toMatch(/2 édition/)
  })
  it('autorise le reste', () => {
    expect(deleteBlockReason('articles', {})).toBeNull()
  })
})
```

- [ ] **Step 3 : Lancer** `npm test` → FAIL (module introuvable).

- [ ] **Step 4 : Implémenter** `studio/app/utils/editions.ts` :
```ts
export type EditionRow = {
  id?: number
  evenement: number
  annee: number | null
  date_start: string | null
  date_end: string | null
  status?: string
  edition_label?: string | null
  lieu?: string | null
  content?: string | null
  [k: string]: unknown
}

const DAY = 86_400_000

export function isPastEdition(e: Pick<EditionRow, 'annee' | 'date_start' | 'date_end'>, now = Date.now()): boolean {
  const d = e.date_end || e.date_start
  if (d) return new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime() + DAY <= now
  return (e.annee ?? 0) < new Date(now).getUTCFullYear()
}

/** Brouillon de l'édition suivante : reprend lieu et programme, vide ce qui dépend de l'année. */
export function nextEditionDraft(last: EditionRow | null, evenementId: number, now = Date.now()): EditionRow {
  const year = new Date(now).getUTCFullYear()
  const annee = Math.max(year, (last?.annee ?? year - 1) + 1)
  return {
    evenement: evenementId,
    status: 'draft',
    annee,
    edition_label: `Édition ${annee}`,
    date_start: null,
    date_end: null,
    lieu: last?.lieu ?? null,
    content: last?.content ?? null,
    affiche: null,
    inscription_url: null,
    inscription_pdf: null,
    resultats: null,
    annule: false
  }
}

export function findDuplicateYear(rows: EditionRow[], candidate: EditionRow): EditionRow | null {
  return rows.find(r => r.evenement === candidate.evenement && r.annee === candidate.annee && r.id !== candidate.id) ?? null
}

export function deleteBlockReason(
  collection: string,
  row: Record<string, unknown>,
  ctx: { editionsCount?: number, now?: number } = {}
): string | null {
  if (collection === 'editions' && isPastEdition(row as EditionRow, ctx.now)) {
    return 'Une édition passée fait partie des archives : passez-la en « Brouillon » pour la masquer au lieu de la supprimer.'
  }
  if (collection === 'evenements' && (ctx.editionsCount ?? 0) > 0) {
    return `Cet évènement a ${ctx.editionsCount} édition(s) : passez-le en « Brouillon » pour le masquer.`
  }
  return null
}
```

- [ ] **Step 5 : Lancer** `npm test` → PASS (12 tests).

- [ ] **Step 6 : Commit**
```bash
git add studio/vitest.config.ts studio/package.json studio/package-lock.json studio/app/utils/editions.ts studio/app/utils/editions.test.ts
git commit -m "Studio : règles des éditions (brouillon N+1, doublons, suppression protégée)"
```

---

### Task 4 : Fonctions pures de migration (TDD)

**Files:** Create `migration/lib/content.mjs`, `migration/lib/content.test.mjs` ; Modify `migration/package.json`

**Interfaces:**
- Produces :
  - `slugify(s: string): string`, `stripDate(name: string): string`
  - `rewriteBody(body: string, resolve: (url: string) => string | null): string` (liens résolus réécrits en `/assets/<id>`)
  - `extractInscription(body: string): { body: string, inscriptionUrl: string | null }`
  - `editionYear(filename: string, date: string | null): number | null`
  - `hugoUrlize(path: string): string` (reproduit les URLs Hugo, cas réels tirés du sitemap live)
  - `mimeFor(filename: string): string`

- [ ] **Step 1 : Tests** `migration/lib/content.test.mjs` :
```js
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
  assert.equal(hugoUrlize('posts/Pétanque'), 'posts/pétanque')
})
test('mimeFor', () => {
  assert.equal(mimeFor('a.JPG'), 'image/jpeg')
  assert.equal(mimeFor('t.gpx'), 'application/gpx+xml')
  assert.equal(mimeFor('r.pdf'), 'application/pdf')
})
```
Script dans `migration/package.json` : `"test": "node --test lib/"`.

- [ ] **Step 2 : Lancer** `cd migration && npm test` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter** `migration/lib/content.mjs` :
```js
// Fonctions pures partagées par migrate.mjs, redirects.mjs (testées dans content.test.mjs).
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')

export function slugify(s) {
  return norm(s).toLowerCase().replace(/['’]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export const stripDate = (name) => name.replace(/^\d{4}-\d{2}(-\d{2})?-/, '').replace(/\.md$/, '')

const KEEP = /^(https?:|mailto:|tel:|#|data:|\/assets\/)/i

export function rewriteBody(body, resolve) {
  if (!body) return body
  return body.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))|(\bsrc=["'])([^"']+)(["'])/g,
    (m, p1, url1, p3, s1, url2, s3) => {
      const url = url1 || url2
      if (!url || KEEP.test(url)) return m
      const id = resolve(url)
      if (!id) return m
      return url1 ? `${p1}/assets/${id}${p3}` : `${s1}/assets/${id}${s3}`
    })
}

export function extractInscription(body) {
  let inscriptionUrl = null
  let out = (body || '').replace(/<!--[\s\S]*?-->\n?/g, '')
  out = out.replace(/<a\b[^>]*href="([^"]+)"[^>]*>\s*<button[^>]*>[\s\S]*?<\/button>\s*<\/a>/gi, (_, href) => {
    inscriptionUrl ??= href
    return ''
  })
  return { body: out.replace(/\n{3,}/g, '\n\n').trim(), inscriptionUrl }
}

export function editionYear(filename, date) {
  const suffix = filename.match(/index(\d{2})\.md$/)?.[1]
  if (suffix) return 2000 + Number(suffix)
  if (!date || String(date).startsWith('2023-01-01')) return null
  return new Date(date).getUTCFullYear()
}

// Comme urlize de Hugo : minuscules, espaces en tirets, on ne garde que lettres, chiffres, marques et - _ . /
export function hugoUrlize(path) {
  return path.normalize('NFC').toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\p{M}\-_./]/gu, '')
}

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  svg: 'image/svg+xml', avif: 'image/avif', pdf: 'application/pdf', gpx: 'application/gpx+xml' }
export const mimeFor = (f) => MIME[f.split('.').pop().toLowerCase()] || 'application/octet-stream'
```

- [ ] **Step 4 : Lancer** `npm test` → PASS (10 tests).

- [ ] **Step 5 : Commit**
```bash
git add migration/lib/content.mjs migration/lib/content.test.mjs migration/package.json
git commit -m "Migration : fonctions pures testées (médias relatifs, boutons d'inscription, URLs Hugo)"
```

---

### Task 5 : Migration du contenu (overrides, pages, accueil, GPX)

**Files:** Modify `migration/migrate.mjs`, `migration/package.json` ; Create `migration/editions-overrides.json`, `migration/review.mjs`, `migration/editions-review.md` (généré)

**Interfaces:**
- Consumes : `migration/lib/content.mjs` (Task 4), schéma (Task 1).
- Produces : contenu en base ; `migration/editions-review.md`.

- [ ] **Step 1 : Brancher `lib/content.mjs`** dans `migrate.mjs`
  - Supprimer les définitions locales de `slugify`, `stripDate`, `rewriteBody` ; importer `import { slugify, stripDate, rewriteBody as rewrite, extractInscription, editionYear, mimeFor } from './lib/content.mjs'`.
  - Garder `norm` (utilisé par `guessCat`).
  - Ajouter : `const rewriteBody = (body, relDir) => rewrite(body, (url) => resolveMedia(relDir, url))`.
  - `MEDIA_EXT` : ajouter `'.gpx'`. Dans `uploadMedia`, remplacer le calcul de `mime` par `const mime = mimeFor(full)` et ajouter `join(ROOT, 'assets', 'gpx')` en tête de `dirs`.

- [ ] **Step 2 : Éditions**

Au niveau module :
```js
const OVERRIDES_FILE = join(__dirname, 'editions-overrides.json')
const OVERRIDES = existsSync(OVERRIDES_FILE) ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')) : {}
const editionLinks = []
```
Dans `migrateEvenements`, remplacer la boucle `for (const f of mdFiles)` par :
```js
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
```
À la fin de `linkArticles()` :
```js
  for (const { editionId, articles } of editionLinks) {
    for (const legacy of articles) {
      const artId = await findId('articles', 'legacy_path', legacy)
      if (!artId) { report.skipped.push(`article introuvable pour édition : ${legacy}`); continue }
      const exists = await api.get(`/items/articles_editions?filter[articles_id][_eq]=${artId}&filter[editions_id][_eq]=${editionId}&limit=1&fields=id`)
      if (!exists?.length) { await api.post('/items/articles_editions', { articles_id: artId, editions_id: editionId }); report.links++ }
    }
  }
```

- [ ] **Step 3 : Remplir `editions-overrides.json`** (tâche de données)

Pour chaque `content/evenements/*/index*.md` (10 fichiers ; `conferences/` n'a pas de markdown et donne un évènement sans édition), lire le texte et les articles de `content/posts` et `content/news` qui en parlent. Une clé par fichier, chemin relatif au dépôt :
```json
{
  "content/evenements/hivernale/index24.md": { "annee": 2024, "date_start": null, "annule": true, "articles": [] },
  "content/evenements/hivernale/index25.md": { "annee": 2025, "date_start": "2025-03-09", "articles": ["content/posts/2025-03-09-Hivernale_2025.md"] },
  "content/evenements/foire-aux-plantes/index25.md": { "annee": 2025, "date_start": "2025-04-06", "articles": ["content/posts/2025-02-foire-aux-plantes.md"] }
}
```
Règles :
- une date n'est renseignée que si elle figure explicitement dans le texte de l'édition ou d'un article lié, sinon `null` ;
- `index.md` reçoit aussi une entrée dès que son année ou sa date est ambiguë (ex. `baleine/index.md`, `telethon/index.md`) ;
- tout article de `posts/` ou `news/` qui annonce une édition ou en fait le compte rendu y est rattaché ;
- `posts/photos/triathlon2024-*.md` n'est pas un article : l'ignorer.
Les trois exemples ci-dessus sont à vérifier dans les textes, pas à recopier aveuglément.

- [ ] **Step 4 : Pages et accueil**
  - `migratePages` : `const rootPages = ['about.md', 'contact.md', 'adherez.md', 'inscriptions.md', 'merci.md']`.
  - Pour `contact`, le formulaire HTML devient un composant (Task 9) : si `slug === 'contact'`, utiliser comme contenu `'Vous souhaitez prendre contact avec nous pour vous informer ou nous rejoindre.'`.
  - `npm i js-yaml` puis `import yaml from 'js-yaml'`. Remplacer le corps de `seedSingletons` par :
```js
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
```

- [ ] **Step 5 : Script de revue** `migration/review.mjs`, et script `"review": "node review.mjs"` :
```js
// Génère editions-review.md : tableau des éditions importées, à faire valider avant l'import final.
import { writeFileSync } from 'node:fs'
import { api } from './lib/directus.mjs'

const eds = await api.get('/items/editions?limit=-1&sort=evenement.title,annee&fields=annee,date_start,date_end,annule,inscription_url,legacy_path,evenement.title,articles_lies.articles_id.title')
const lines = [
  '# Éditions importées (à valider)', '',
  '| Évènement | Année | Date | Annulée | Inscription | Articles rattachés | Source |',
  '|---|---|---|---|---|---|---|',
]
for (const e of eds) {
  const arts = (e.articles_lies || []).map((a) => a.articles_id?.title).filter(Boolean).join(' ; ')
  const date = [e.date_start, e.date_end].filter(Boolean).join(' au ') || 'sans date'
  lines.push(`| ${e.evenement?.title} | ${e.annee} | ${date} | ${e.annule ? 'oui' : ''} | ${e.inscription_url ? 'lien' : ''} | ${arts} | ${e.legacy_path} |`)
}
writeFileSync(new URL('./editions-review.md', import.meta.url), lines.join('\n') + '\n')
console.log(`${eds.length} éditions → editions-review.md`)
```

- [ ] **Step 6 : Lancer**
```bash
cd migration && npm run migrate && npm run review && cat report.json
```
Expected : `evenements: 8`, `editions: 10`, `articles` = `ls content/posts/*.md content/news/*.md | wc -l`, `pages: 7`, `skipped: []`. Relancer `npm run migrate` : `files: 0` et mêmes compteurs, aucun doublon dans Directus (idempotence).

- [ ] **Step 7 : CHECKPOINT Quentin** : montrer `migration/editions-review.md` et attendre sa validation. Corriger `editions-overrides.json` puis relancer `npm run migrate && npm run review` jusqu'à validation.

- [ ] **Step 8 : Commit**
```bash
git add migration/migrate.mjs migration/review.mjs migration/editions-overrides.json migration/editions-review.md migration/package.json migration/package-lock.json
git commit -m "Migration : éditions corrigées et rattachées, accueil, pages inscriptions et merci, GPX"
```

---

### Task 6 : Infrastructure du site (proxy médias, cache, types)

**Files:** Modify `site/nuxt.config.ts`, `site/app/types.ts`, `site/package.json`

- [ ] **Step 1 : `nuxt.config.ts`** : en tête, `const DIRECTUS_URL = import.meta.env.NUXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:18056'`, puis :
```ts
  devServer: { port: Number(import.meta.env.NUXT_PORT ?? 13010) },

  runtimeConfig: {
    public: {
      directusUrl: DIRECTUS_URL,
      siteUrl: import.meta.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:13010',
      gasFormUrl: 'https://script.google.com/macros/s/AKfycbxTJwyga8hOEfVUfCIaMFl0QfnqmLoxAsra4XXpp9SebNJyQpVnkHS7lciGBhaDvxDKfg/exec'
    }
  },

  routeRules: {
    // Le markdown stocke les images en /assets/<id> : on les sert depuis Directus.
    '/assets/**': { proxy: `${DIRECTUS_URL}/assets/**` },
    '/**': { swr: 60 }
  },
```
`package.json` : `"dev": "nuxt dev --port 13010"`.

- [ ] **Step 2 : Types** (`types.ts`) : ajouter à `SiteParams` les champs optionnels `devise`, `bandeau_texte`, `bandeau_lien`, `asso_titre`, `asso_texte`, `asso_image`, `ateliers_texte`, `newsletter_texte` (`string | null`) ; à `Edition` : `articles_lies?: { articles_id: Article }[]` ; nouveau type :
```ts
export interface Slide { id: number, title?: string | null, lien?: string | null, image?: string | null, sort?: number }
```

- [ ] **Step 3 : Vérifier** : `npm run dev`, ouvrir `http://localhost:13010/evenements/triathlon` : les images du programme se chargent (`/assets/<id>` en 200 dans l'onglet réseau). `npx nuxi typecheck` : pas de nouvelle erreur.

- [ ] **Step 4 : Commit** : `git add site/nuxt.config.ts site/app/types.ts site/package.json && git commit -m "Site : proxy des médias, cache SWR 60 s, port 13010"`

---

### Task 7 : Pages évènement et archives d'édition

**Files:** Modify `site/app/pages/evenements/[slug].vue`, `site/app/pages/evenements/[slug]/[annee].vue`

**Interfaces:**
- Consumes : `currentEdition`, `pastEditions`, `isFinished`, `adjacentEditions` (Task 2).

- [ ] **Step 1 : Page évènement** (`[slug].vue`)
  - Requête des éditions : `sort: ['-annee']`.
  - Date de l'édition en cours (remplace le `<span v-if="current.date_start">`) :
```vue
<span class="text-sm text-[var(--color-ink-2)]">
  <UIcon name="i-lucide-calendar" class="size-4 inline -mt-0.5" />
  {{ current.date_start ? formatDate(current.date_start) : 'Date à venir' }}
</span>
```
  - Juste après la ligne des badges :
```vue
<p v-if="!current.annule && isFinished(current)" class="mb-4 rounded-lg bg-[var(--color-paper)] px-4 py-2 text-sm text-[var(--color-ink-2)]">
  {{ current.edition_label }} terminée. La prochaine édition sera bientôt annoncée.
</p>
```
  - Boutons « S’inscrire » et « Bulletin d’inscription » : ajouter `&& !isFinished(current)` à leur `v-if`.
  - Liens d'archive : `` :to="`/evenements/${evenement.slug}/${ed.annee}`" `` (supprimer le repli `|| ed.id`) ; date : `ed.date_start ? formatDate(ed.date_start) : ''` inchangé.

- [ ] **Step 2 : Page d'archive** (`[annee].vue`) : remplacer le `<script setup>` par :
```ts
import type { Article, Edition, Evenement } from '~/types'

const route = useRoute()
const slug = route.params.slug as string
const annee = Number(route.params.annee)
const { getUrl } = useDirectusFile()

const { data: list } = await useDirectusCollection<Edition & { evenement: Evenement }>('editions', {
  filter: { status: { _eq: 'published' }, evenement: { slug: { _eq: slug } }, annee: { _eq: Number.isInteger(annee) ? annee : -1 } },
  limit: 1,
  fields: ['*', { evenement: ['slug', 'title', 'lieu_defaut'] }, { articles_lies: [{ articles_id: ['slug', 'title', 'date', 'status'] }] }]
})
const edition = computed(() => list.value?.[0] || null)
if (!edition.value) throw createError({ statusCode: 404, statusMessage: 'Édition introuvable' })

const { data: siblings } = await useDirectusCollection<Edition>('editions', {
  filter: { status: { _eq: 'published' }, evenement: { slug: { _eq: slug } } },
  fields: ['id', 'annee', 'edition_label', 'date_start', 'date_end'],
  sort: ['annee']
})
const nav = computed(() => edition.value ? adjacentEditions(siblings.value || [], edition.value) : { prev: null, next: null })
const archived = computed(() => !!edition.value && isFinished(edition.value))
const articles = computed(() => (edition.value?.articles_lies || [])
  .map(a => a.articles_id as Article & { status: string })
  .filter(a => a?.status === 'published'))

const afficheUrl = computed(() => getUrl(edition.value?.affiche, { width: '900' }))
useHead({ title: () => `${edition.value?.evenement?.title} · ${edition.value?.edition_label}` })
```
  Dans le template :
  - en tête du `UContainer` :
```vue
<div v-if="archived" class="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 text-sm">
  <UIcon name="i-lucide-archive" class="size-4 inline -mt-0.5" /> Archive : {{ edition.edition_label }} de {{ edition.evenement?.title }}.
</div>
```
  - date : `{{ edition.date_start ? formatDate(edition.date_start) : 'Date non précisée' }}` (toujours affichée) ;
  - titre de la section résultats : « Bilan / résultats » ;
  - après les résultats :
```vue
<section v-if="articles.length">
  <h2 class="text-xl font-semibold mb-2">Articles de cette édition</h2>
  <ul class="space-y-1">
    <li v-for="a in articles" :key="a.slug">
      <NuxtLink :to="`/blog/${a.slug}`" class="text-[var(--color-forest-600)] hover:underline">{{ a.title }}</NuxtLink>
      <span class="text-xs text-[var(--color-ink-3)]"> · {{ formatDate(a.date) }}</span>
    </li>
  </ul>
</section>
<nav class="flex justify-between border-t border-[var(--color-rule)] pt-6 text-sm">
  <NuxtLink v-if="nav.prev" :to="`/evenements/${slug}/${nav.prev.annee}`">← {{ nav.prev.edition_label }}</NuxtLink><span v-else />
  <NuxtLink v-if="nav.next" :to="`/evenements/${slug}/${nav.next.annee}`">{{ nav.next.edition_label }} →</NuxtLink>
</nav>
```

- [ ] **Step 3 : Vérifier** dans le navigateur :
  - `/evenements/hivernale` : 2026 en tête avec « terminée », archives 2025 et 2024 ;
  - `/evenements/hivernale/2024` : bandeau archive, « Annulé », lien vers 2025 ;
  - `/evenements/lyricantrail` : édition du 11 octobre 2026 en tête avec le bouton S'inscrire si un lien existe ;
  - `/evenements/hivernale/1999` et `/evenements/hivernale/abc` → 404.

- [ ] **Step 4 : Commit** : `git add site/app/pages/evenements && git commit -m "Site : édition en cours, archives navigables et articles par édition"`

---

### Task 8 : Accueil, navigation, pages éditoriales

**Files:** Create `site/app/components/HomeCarousel.vue` ; Modify `site/app/pages/index.vue`, `site/app/layouts/default.vue`, `site/app/pages/[slug].vue`

**Interfaces:**
- Consumes : `Slide`, `SiteParams` (Task 6) ; `NewsletterForm`, `ContactForm` (Task 9 : faire la Task 9 avant le Step 3 ou ajouter les balises à la fin de la Task 9).

- [ ] **Step 1 : Navigation** (`default.vue`), alignée sur le site actuel :
```ts
const nav = [
  { label: 'L’association', to: '/about' },
  { label: 'Évènements', to: '/evenements' },
  { label: 'Ateliers', to: '/ateliers' },
  { label: 'Activités', to: '/activites' },
  { label: 'Savanturiers', to: '/club-multisports' },
  { label: 'Médiathèque', to: '/mediatheque' },
  { label: 'Actualités', to: '/blog' },
  { label: 'Contact', to: '/contact' },
  { label: 'Adhérer', to: '/adherez' }
]
```
Vérifier qu'à 1024 px la barre ne déborde pas ; sinon passer le breakpoint du menu complet de `lg` à `xl` (classes `lg:flex` / `lg:hidden` du header).

- [ ] **Step 2 : `HomeCarousel.vue`**
```vue
<script setup lang="ts">
import type { Slide } from '~/types'
const props = defineProps<{ slides: Slide[] }>()
const { getUrl } = useDirectusFile()
const items = computed(() => props.slides.filter(s => s.image))
</script>

<template>
  <UCarousel v-if="items.length" v-slot="{ item }" :items="items" loop :autoplay="{ delay: 5000 }" arrows dots class="rounded-2xl overflow-hidden">
    <component :is="item.lien ? resolveComponent('NuxtLink') : 'div'" :to="item.lien || undefined" class="block relative">
      <img :src="getUrl(item.image, { width: '1400', height: '600', fit: 'cover' })!" :alt="item.title || ''" class="w-full aspect-[7/3] object-cover">
      <span v-if="item.title" class="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-1 text-white text-sm">{{ item.title }}</span>
    </component>
  </UCarousel>
</template>
```

- [ ] **Step 3 : Accueil** (`index.vue`)
  - Script : `const { data: slides } = await useDirectusCollection<Slide>('accueil_slides', { sort: ['sort'], fields: ['*'] })` et `const { getUrl } = useDirectusFile()`.
  - `PageHero` : `:kicker="site?.devise || 'Larchant · Forêt de Fontainebleau'"`.
  - Premier bouton du hero, avant « Les évènements » :
```vue
<UButton v-if="site?.bandeau_texte && site?.bandeau_lien" :to="site.bandeau_lien" size="lg" color="primary" trailing-icon="i-lucide-arrow-right">{{ site.bandeau_texte }}</UButton>
```
  (le bouton « Les évènements » passe alors en `variant="soft"`).
  - En tête du `UContainer` : `<HomeCarousel :slides="slides || []" />`.
  - Après « Prochains rendez-vous », section association :
```vue
<section v-if="site?.asso_texte" class="grid gap-8 md:grid-cols-2 items-center">
  <div>
    <h2 class="text-2xl font-semibold mb-3">{{ site.asso_titre || 'Notre association' }}</h2>
    <MarkdownBody :text="site.asso_texte" />
    <UButton to="/about" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">En savoir plus</UButton>
  </div>
  <img v-if="site.asso_image" :src="getUrl(site.asso_image, { width: '900' })!" alt="" class="rounded-2xl w-full object-cover">
</section>
```
  - Juste sous le titre de la section ateliers : `<MarkdownBody v-if="site?.ateliers_texte" :text="site.ateliers_texte" class="mb-6" />`.
  - Dernière section : `<NewsletterForm :intro="site?.newsletter_texte" />`.

- [ ] **Step 4 : Pages éditoriales** (`[slug].vue`)
  - Sous `<MarkdownBody :text="page.content" />` : `<ContactForm v-if="showContact" />`.
  - Médiathèque : 
```ts
const { data: newsletters } = slug === 'mediatheque'
  ? await useDirectusCollection<Newsletter>('newsletters', { filter: { status: { _eq: 'published' } }, sort: ['-date'], limit: 3, fields: ['slug', 'title', 'date', 'fichier'] })
  : { data: ref<Newsletter[]>([]) }
```
  puis, dans la colonne principale, si `newsletters?.length`, un titre « Dernières newsletters » et une carte par newsletter (titre, `formatMonth(date)`, lien vers `getUrl(n.fichier)` en `target="_blank"`), suivi d'un lien « Toutes les newsletters » vers `/newsletters`.

- [ ] **Step 5 : Vérifier** : accueil (carrousel qui défile, bouton « Inscriptions aux ateliers 2026-2027 » vers `/inscriptions`, textes association et ateliers) ; `/inscriptions` (bulletins adultes et enfants téléchargeables) ; `/mediatheque` (3 newsletters) ; `/about`, `/club-multisports`, `/adherez` ; menu mobile.

- [ ] **Step 6 : Commit** : `git add site/app && git commit -m "Site : accueil éditable, carrousel, navigation et pages éditoriales"`

---

### Task 9 : Formulaires contact et newsletter (TDD)

À exécuter avant les Steps 3 et 4 de la Task 8 (qui utilisent ces composants).

**Files:** Create `site/app/utils/gasForm.ts`, `site/app/utils/gasForm.test.ts`, `site/app/components/ContactForm.vue`, `site/app/components/NewsletterForm.vue`

**Interfaces:**
- Produces : `submitGasForm(action: string, fields: Record<string, string>, fetcher?: typeof fetch): Promise<'ok' | 'invalid' | 'error'>` ; `<ContactForm />` ; `<NewsletterForm :intro?="string | null" />`.

- [ ] **Step 1 : Tests** `site/app/utils/gasForm.test.ts` :
```ts
import { describe, it, expect, vi } from 'vitest'
import { submitGasForm } from './gasForm'

const res = (text: string) => Promise.resolve({ text: () => Promise.resolve(text) } as Response)

describe('submitGasForm', () => {
  it('envoie les champs, le piège vide et le jeton, et renvoie ok', async () => {
    const f = vi.fn((_url: string, _init: RequestInit) => res(' ok\n'))
    expect(await submitGasForm('https://gas', { email: 'a@b.fr' }, f as unknown as typeof fetch)).toBe('ok')
    const body = f.mock.calls[0]![1].body as URLSearchParams
    expect(body.get('email')).toBe('a@b.fr')
    expect(body.get('t')).toBe('larchant-2026')
    expect(body.get('bot-field')).toBe('')
  })
  it('renvoie invalid si le script ne répond pas ok', async () => {
    expect(await submitGasForm('https://gas', {}, (() => res('bad email')) as unknown as typeof fetch)).toBe('invalid')
  })
  it('renvoie error si le réseau échoue', async () => {
    expect(await submitGasForm('https://gas', {}, (() => Promise.reject(new Error('x'))) as unknown as typeof fetch)).toBe('error')
  })
})
```

- [ ] **Step 2 : Lancer** `cd site && npm test` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter** `site/app/utils/gasForm.ts` :
```ts
/** Envoi vers le Google Apps Script de l'association (même protocole que l'ancien site Hugo). */
export async function submitGasForm(
  action: string,
  fields: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<'ok' | 'invalid' | 'error'> {
  const body = new URLSearchParams({ ...fields, 'bot-field': '' })
  body.append('t', ['lar', 'chant', '-', '2026'].join(''))
  try {
    const r = await fetcher(action, { method: 'POST', body })
    return (await r.text()).trim() === 'ok' ? 'ok' : 'invalid'
  } catch {
    return 'error'
  }
}
```

- [ ] **Step 4 : Lancer** `npm test` → PASS.

- [ ] **Step 5 : `ContactForm.vue`**
```vue
<script setup lang="ts">
const { gasFormUrl } = useRuntimeConfig().public
const state = reactive({ email: '', subject: '', message: '', trap: '' })
const sending = ref(false)
const error = ref('')

async function onSubmit() {
  if (state.trap) return
  sending.value = true
  error.value = ''
  const r = await submitGasForm(gasFormUrl as string, { form: 'contact', email: state.email, subject: state.subject, message: state.message })
  sending.value = false
  if (r === 'ok') return navigateTo('/merci')
  error.value = r === 'invalid'
    ? 'L’envoi a échoué, merci de vérifier votre adresse email.'
    : 'Une erreur est survenue, merci de réessayer plus tard.'
}
</script>

<template>
  <form class="space-y-5 max-w-xl" @submit.prevent="onSubmit">
    <input v-model="state.trap" type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
    <UFormField label="Votre email" required>
      <UInput v-model="state.email" type="email" required class="w-full" placeholder="contact@votre-email.fr" />
    </UFormField>
    <UFormField label="Sujet" required>
      <UInput v-model="state.subject" required class="w-full" placeholder="De quoi voulez-vous nous parler ?" />
    </UFormField>
    <UFormField label="Votre message">
      <UTextarea v-model="state.message" :rows="8" class="w-full" placeholder="Laissez-nous un message..." />
    </UFormField>
    <UButton type="submit" :loading="sending">Envoyer</UButton>
    <p v-if="error" class="text-red-600 text-sm" role="alert">{{ error }}</p>
  </form>
</template>
```

- [ ] **Step 6 : `NewsletterForm.vue`**
```vue
<script setup lang="ts">
defineProps<{ intro?: string | null }>()
const { gasFormUrl } = useRuntimeConfig().public
const email = ref('')
const trap = ref('')
const sending = ref(false)
const message = ref('')

const MESSAGES = {
  ok: 'Merci, vous êtes bien inscrit !',
  invalid: 'Adresse invalide, merci de vérifier votre email.',
  error: 'Une erreur est survenue, merci de réessayer plus tard.'
} as const

async function onSubmit() {
  if (trap.value) return
  sending.value = true
  const r = await submitGasForm(gasFormUrl as string, { email: email.value })
  sending.value = false
  message.value = MESSAGES[r]
  if (r === 'ok') email.value = ''
}
</script>

<template>
  <section class="rounded-2xl bg-[var(--color-forest-600)] text-white p-8 text-center space-y-4">
    <h2 class="text-2xl font-semibold">Inscrivez-vous à notre liste de diffusion</h2>
    <MarkdownBody v-if="intro" :text="intro" class="text-white/80" />
    <form class="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row" @submit.prevent="onSubmit">
      <input v-model="trap" type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
      <UInput v-model="email" type="email" required placeholder="Entrez votre email" aria-label="Adresse email" class="flex-1" />
      <UButton type="submit" color="neutral" :loading="sending">Inscrivez-moi !</UButton>
    </form>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
```

- [ ] **Step 7 : Vérifier en vrai** : envoyer depuis `/contact` un message avec le sujet « TEST refonte » → redirection `/merci` ; inscrire une adresse de test à la newsletter → « Merci, vous êtes bien inscrit ! ». **Prévenir Quentin** que deux entrées de test sont arrivées côté Google Sheet, pour qu'il les supprime.

- [ ] **Step 8 : Commit** : `git add site/app && git commit -m "Site : formulaires contact et newsletter vers Google Apps Script"`

---

### Task 10 : Redirections, classement triathlon, sitemap, 404, meta

**Files:** Create `migration/redirects.mjs`, `migration/redirects-manual.json`, `site/redirects.json`, `site/public/classement/index.html`, `site/public/classement_general/index.html`, `site/public/athlete_data.json`, `site/public/climbingCoefficients.json`, `site/server/routes/sitemap.xml.ts`, `site/app/error.vue` ; Modify `site/nuxt.config.ts`, `site/app/layouts/default.vue`, pages de détail

**Interfaces:**
- Consumes : `hugoUrlize` (Task 4) ; items avec `legacy_path` en base (Task 5).
- Produces : `site/redirects.json` au format `{ "<ancien chemin avec slash final>": "<nouveau chemin>" }`.

- [ ] **Step 1 : Classement 2024 en statique** (documents HTML complets, sans syntaxe Hugo)
```bash
mkdir -p site/public/classement site/public/classement_general
cp layouts/page/classement.html site/public/classement/index.html
cp layouts/page/classement_general.html site/public/classement_general/index.html
cp static/athlete_data.json static/climbingCoefficients.json site/public/
```

- [ ] **Step 2 : Générateur** `migration/redirects.mjs`, script `"redirects": "node redirects.mjs"` :
```js
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
    byOld.set(old, prefix ? `/${prefix}/${it.slug}` : `/${it.slug}`)
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
```
Point de départ de `migration/redirects-manual.json` (le compléter jusqu'à 0 URL sans correspondance ; tags et pagination vont vers `/blog`) :
```json
{
  "/": "/",
  "/posts/": "/blog",
  "/news/": "/blog",
  "/newsletter/": "/newsletters",
  "/ateliers/Djembe/": "/ateliers/djembe",
  "/posts/photos/triathlon2024-1/": "/evenements/triathlon/2024",
  "/posts/photos/triathlon2024-2/": "/evenements/triathlon/2024",
  "/classement/": "/classement/",
  "/classement_general/": "/classement_general/"
}
```
Lancer `cd migration && npm run redirects`. Expected : sortie code 0, et par exemple `"/posts/2024-06-08-pétanque/": "/blog/petanque-2024"` (slug exact selon la migration).

- [ ] **Step 3 : Brancher** dans `site/nuxt.config.ts` :
```ts
import redirects from './redirects.json'

const redirectRules = Object.fromEntries(Object.entries(redirects as Record<string, string>).flatMap(([from, to]) => {
  const rule = { redirect: { to, statusCode: 301 } }
  // Les URLs Hugo existent avec et sans slash final, et le navigateur peut les envoyer encodées.
  const bare = from.replace(/\/$/, '')
  const variants = new Set([from, bare, encodeURI(from), encodeURI(bare)].filter(Boolean))
  return [...variants].map(v => [v, rule])
}))
```
et dans `routeRules`, ajouter `...redirectRules,` avant `'/**': { swr: 60 }`.

- [ ] **Step 4 : Sitemap** `site/server/routes/sitemap.xml.ts` :
```ts
import { createDirectus, rest, readItems } from '@directus/sdk'

type Row = { slug?: string, annee?: number, evenement?: { slug?: string } }

export default defineCachedEventHandler(async (event) => {
  const { directusUrl, siteUrl } = useRuntimeConfig().public
  const d = createDirectus(directusUrl as string).with(rest())
  const pub = { status: { _eq: 'published' } }
  const get = (c: string, fields: unknown[]) => d.request(readItems(c as never, { filter: pub, fields, limit: -1 } as never)) as Promise<Row[]>
  const [ev, ed, ar, at, ac, pg] = await Promise.all([
    get('evenements', ['slug']), get('editions', ['annee', { evenement: ['slug'] }]), get('articles', ['slug']),
    get('ateliers', ['slug']), get('activites', ['slug']), get('pages', ['slug'])
  ])
  const paths = ['/', '/evenements', '/ateliers', '/activites', '/blog', '/newsletters',
    ...ev.map(x => `/evenements/${x.slug}`),
    ...ed.filter(x => x.evenement?.slug && x.annee).map(x => `/evenements/${x.evenement!.slug}/${x.annee}`),
    ...ar.map(x => `/blog/${x.slug}`), ...at.map(x => `/ateliers/${x.slug}`),
    ...ac.map(x => `/activites/${x.slug}`), ...pg.map(x => `/${x.slug}`)]
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const body = paths.map(p => `  <url><loc>${siteUrl}${encodeURI(p)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}, { maxAge: 600 })
```
Ajouter `site/public/robots.txt` :
```
User-agent: *
Allow: /
Sitemap: https://beta.larchantanimation.fr/sitemap.xml
```
(Tant que le site est en beta, Quentin peut préférer `Disallow: /` pour éviter le contenu dupliqué avec le site actuel : lui poser la question au checkpoint final.)

- [ ] **Step 5 : `site/app/error.vue`**
```vue
<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error.statusCode === 404)
useHead({ title: is404.value ? 'Page introuvable' : 'Erreur' })
</script>

<template>
  <NuxtLayout>
    <UContainer class="py-24 text-center space-y-4">
      <p class="text-6xl font-bold text-[var(--color-forest-600)]">{{ error.statusCode }}</p>
      <h1 class="text-2xl font-semibold">{{ is404 ? 'Cette page n’existe pas (ou plus).' : 'Une erreur est survenue.' }}</h1>
      <UButton @click="clearError({ redirect: '/' })">Retour à l’accueil</UButton>
    </UContainer>
  </NuxtLayout>
</template>
```

- [ ] **Step 6 : Meta** : dans `default.vue`, `useSeoMeta({ ogSiteName: 'Larchant Animation', ogType: 'website' })`. Dans `evenements/[slug].vue`, `blog/[slug].vue`, `ateliers/[slug].vue`, `activites/[slug].vue` : `useSeoMeta({ description: () => <description de l'item, 160 caractères max>, ogImage: () => getUrl(<image principale>, { width: '1200' }) })` (pour un article : `description` et `preview` ; évènement : `description` tronquée et `image`).

- [ ] **Step 7 : Vérifier**
```bash
curl -sI "http://localhost:13010/posts/2024-06-08-p%C3%A9tanque/" | grep -iE "^(HTTP|location)"   # 301 vers /blog/...
curl -sI http://localhost:13010/ateliers/Djembe | grep -iE "^(HTTP|location)"                    # 301 vers /ateliers/djembe
curl -so /dev/null -w "%{http_code}\n" http://localhost:13010/classement/                         # 200
curl -s http://localhost:13010/sitemap.xml | grep -c "<url>"                                      # > 60
curl -so /dev/null -w "%{http_code}\n" http://localhost:13010/nimportequoi                        # 404
```
Le test complet de toutes les anciennes URLs est fait par `verify.mjs` (Task 16).

- [ ] **Step 8 : Commit** : `git add migration/redirects.mjs migration/redirects-manual.json migration/package.json site && git commit -m "Site : redirections 301, classement triathlon 2024, sitemap, page 404"`

---

### Task 11 : Éditeur markdown moderne (TDD sur les transformations)

**Files:** Create `studio/app/utils/markdownFormat.ts`, `studio/app/utils/markdownFormat.test.ts`, `studio/app/composables/useMarkdownRender.ts`, `studio/app/components/MarkdownEditor.vue` ; Modify `studio/nuxt.config.ts`, `studio/app/assets/css/main.css`, `studio/package.json`

**Interfaces:**
- Produces :
  - `type FormatKind = 'bold' | 'italic' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'link'`
  - `applyFormat(doc: string, from: number, to: number, kind: FormatKind): { doc: string, from: number, to: number }`
  - `insertUploadedImage(upload: () => Promise<string | null>, insert: (md: string) => void, onError: (msg: string) => void): Promise<void>`
  - `useMarkdownRender(): { render(text?: string | null): string }`
  - `<MarkdownEditor v-model="string | null" :rows?="number" />`

- [ ] **Step 1 : Dépendances** : `cd studio && npm i codemirror @codemirror/lang-markdown @codemirror/state @codemirror/view markdown-it && npm i -D @types/markdown-it`

- [ ] **Step 2 : Tests** `studio/app/utils/markdownFormat.test.ts` :
```ts
import { describe, it, expect, vi } from 'vitest'
import { applyFormat, insertUploadedImage } from './markdownFormat'

describe('applyFormat', () => {
  it('met la sélection en gras et la garde sélectionnée', () => {
    expect(applyFormat('un mot ici', 3, 6, 'bold')).toEqual({ doc: 'un **mot** ici', from: 5, to: 8 })
  })
  it('sans sélection, insère les marqueurs avec le curseur au milieu', () => {
    expect(applyFormat('ab', 1, 1, 'italic')).toEqual({ doc: 'a__b', from: 2, to: 2 })
  })
  it('titre : préfixe le début de la ligne courante', () => {
    expect(applyFormat('l1\nTitre', 5, 5, 'h2')).toEqual({ doc: 'l1\n## Titre', from: 8, to: 8 })
  })
  it('liste à puces sur plusieurs lignes', () => {
    expect(applyFormat('a\nb', 0, 3, 'ul').doc).toBe('- a\n- b')
  })
  it('liste numérotée', () => {
    expect(applyFormat('a\nb', 0, 3, 'ol').doc).toBe('1. a\n2. b')
  })
  it('lien : la sélection devient le texte, l’URL est sélectionnée', () => {
    expect(applyFormat('voir site', 5, 9, 'link')).toEqual({ doc: 'voir [site](https://)', from: 12, to: 20 })
  })
})

describe('insertUploadedImage', () => {
  it('insère la balise image après upload', async () => {
    const insert = vi.fn()
    await insertUploadedImage(async () => 'uuid-1', insert, vi.fn())
    expect(insert).toHaveBeenCalledWith('![](/assets/uuid-1)')
  })
  it('signale l’échec sans rien insérer', async () => {
    const insert = vi.fn()
    const onError = vi.fn()
    await insertUploadedImage(async () => { throw new Error('401') }, insert, onError)
    expect(insert).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('L’image n’a pas pu être envoyée. Votre texte est conservé.')
  })
  it('signale un upload sans identifiant', async () => {
    const onError = vi.fn()
    await insertUploadedImage(async () => null, vi.fn(), onError)
    expect(onError).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3 : Lancer** `npm test` → FAIL (module introuvable).

- [ ] **Step 4 : Implémenter** `studio/app/utils/markdownFormat.ts` :
```ts
export type FormatKind = 'bold' | 'italic' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'link'

const WRAP: Partial<Record<FormatKind, string>> = { bold: '**', italic: '_' }
const LINE: Partial<Record<FormatKind, (i: number) => string>> = {
  h2: () => '## ', h3: () => '### ', ul: () => '- ', ol: i => `${i + 1}. `, quote: () => '> '
}

/** Applique un format markdown à la sélection [from, to] ; renvoie le texte et la nouvelle sélection. */
export function applyFormat(doc: string, from: number, to: number, kind: FormatKind): { doc: string, from: number, to: number } {
  const sel = doc.slice(from, to)
  const wrap = WRAP[kind]
  if (wrap) {
    return { doc: doc.slice(0, from) + wrap + sel + wrap + doc.slice(to), from: from + wrap.length, to: to + wrap.length }
  }
  if (kind === 'link') {
    const urlStart = from + sel.length + 3
    return { doc: `${doc.slice(0, from)}[${sel}](https://)${doc.slice(to)}`, from: urlStart, to: urlStart + 8 }
  }
  const prefix = LINE[kind]!
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1
  const lines = doc.slice(lineStart, to).split('\n')
  const block = lines.map((l, i) => prefix(i) + l).join('\n')
  const added = block.length - (to - lineStart)
  return { doc: doc.slice(0, lineStart) + block + doc.slice(to), from: from + prefix(0).length, to: to + added }
}

export async function insertUploadedImage(
  upload: () => Promise<string | null>,
  insert: (md: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    const id = await upload()
    if (!id) throw new Error('upload sans identifiant')
    insert(`![](/assets/${id})`)
  } catch {
    onError('L’image n’a pas pu être envoyée. Votre texte est conservé.')
  }
}
```

- [ ] **Step 5 : Lancer** `npm test` → PASS (9 tests).

- [ ] **Step 6 : Rendu identique au site**

`studio/app/composables/useMarkdownRender.ts` :
```ts
import MarkdownIt from 'markdown-it'

// Mêmes options que site/app/composables/useMarkdown.ts : l'aperçu correspond au rendu du site.
const md = new MarkdownIt({ html: true, breaks: true, linkify: true })

export function useMarkdownRender() {
  return { render: (text?: string | null) => (text ? md.render(text) : '') }
}
```
Copier dans `studio/app/assets/css/main.css` toutes les règles `.prose-la` de `site/app/assets/css/main.css` (à partir de la ligne 119) et les variables CSS qu'elles utilisent (`--font-display`, `--color-ink*`, `--color-forest-*`, `--color-rule`), en les déclarant sous `.prose-la { ... }` pour ne pas toucher au thème du Studio.

`studio/nuxt.config.ts` : dans `routeRules`, ajouter `'/assets/**': { proxy: \`${DIRECTUS_URL}/assets/**\` }` ; dans `runtimeConfig.public`, `siteUrl: import.meta.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:13010'` ; `devServer: { port: 13011 }` ; `package.json` : `"dev": "nuxt dev --port 13011"`.

- [ ] **Step 7 : `studio/app/components/MarkdownEditor.vue`**
```vue
<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { applyFormat, insertUploadedImage, type FormatKind } from '~/utils/markdownFormat'

const model = defineModel<string | null>({ default: '' })
const props = withDefaults(defineProps<{ rows?: number }>(), { rows: 14 })
const { uploadToDirectus, toast } = useStudio()
const { render } = useMarkdownRender()

const host = ref<HTMLElement>()
const tab = ref<'write' | 'preview'>('write')
const fullscreen = ref(false)
let view: EditorView | null = null

const TOOLS: { kind: FormatKind, icon: string, label: string }[] = [
  { kind: 'h2', icon: 'i-lucide-heading-2', label: 'Titre' },
  { kind: 'h3', icon: 'i-lucide-heading-3', label: 'Sous-titre' },
  { kind: 'bold', icon: 'i-lucide-bold', label: 'Gras' },
  { kind: 'italic', icon: 'i-lucide-italic', label: 'Italique' },
  { kind: 'ul', icon: 'i-lucide-list', label: 'Liste' },
  { kind: 'ol', icon: 'i-lucide-list-ordered', label: 'Liste numérotée' },
  { kind: 'quote', icon: 'i-lucide-quote', label: 'Citation' },
  { kind: 'link', icon: 'i-lucide-link', label: 'Lien' }
]

function format(kind: FormatKind) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const r = applyFormat(view.state.doc.toString(), from, to, kind)
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: r.doc }, selection: { anchor: r.from, head: r.to } })
  view.focus()
}

function insertAtCursor(text: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } })
}

async function uploadFiles(files: FileList | File[]) {
  for (const file of Array.from(files).filter(f => f.type.startsWith('image/'))) {
    await insertUploadedImage(
      () => uploadToDirectus(file),
      md => insertAtCursor(`${md}\n`),
      msg => toast.add({ title: msg, color: 'error' })
    )
  }
}

function pickImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => { if (input.files) uploadFiles(input.files) }
  input.click()
}

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    doc: model.value || '',
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({ '&': { minHeight: `${props.rows * 1.6}em` }, '.cm-scroller': { fontFamily: 'ui-monospace, monospace' } }),
      EditorView.updateListener.of((u) => { if (u.docChanged) model.value = u.state.doc.toString() }),
      EditorView.domEventHandlers({
        paste: (e) => { const f = e.clipboardData?.files; if (f?.length) { e.preventDefault(); uploadFiles(f); return true } return false },
        drop: (e) => { const f = e.dataTransfer?.files; if (f?.length) { e.preventDefault(); uploadFiles(f); return true } return false }
      })
    ]
  })
})

watch(model, (v) => {
  if (view && (v || '') !== view.state.doc.toString()) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v || '' } })
  }
})
onBeforeUnmount(() => view?.destroy())
</script>

<template>
  <div :class="fullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-950 p-4 flex flex-col' : 'rounded-lg border border-gray-200 dark:border-gray-800'">
    <div class="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-800 p-1">
      <UTooltip v-for="t in TOOLS" :key="t.kind" :text="t.label">
        <UButton :icon="t.icon" variant="ghost" color="neutral" size="xs" :aria-label="t.label" @click="format(t.kind)" />
      </UTooltip>
      <UTooltip text="Image">
        <UButton icon="i-lucide-image-plus" variant="ghost" color="neutral" size="xs" aria-label="Image" @click="pickImage" />
      </UTooltip>
      <div class="ml-auto flex gap-1">
        <UButton class="lg:hidden" size="xs" variant="soft" :color="tab === 'write' ? 'primary' : 'neutral'" @click="tab = 'write'">Écrire</UButton>
        <UButton class="lg:hidden" size="xs" variant="soft" :color="tab === 'preview' ? 'primary' : 'neutral'" @click="tab = 'preview'">Aperçu</UButton>
        <UButton :icon="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" variant="ghost" color="neutral" size="xs" aria-label="Plein écran" @click="fullscreen = !fullscreen" />
      </div>
    </div>
    <div class="grid lg:grid-cols-2 flex-1 min-h-0">
      <div ref="host" :class="['min-w-0 overflow-auto', tab === 'preview' ? 'hidden lg:block' : '']" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div :class="['prose-la overflow-auto border-l border-gray-200 dark:border-gray-800 p-4 text-sm', tab === 'write' ? 'hidden lg:block' : '']" v-html="render(model)" />
    </div>
    <p class="px-2 py-1 text-xs text-gray-500">Astuce : collez ou glissez une image directement dans le texte.</p>
  </div>
</template>
```
La vérification manuelle de l'éditeur se fait à la Task 12, Step 4, une fois branché dans les formulaires.

- [ ] **Step 8 : Commit** : `git add studio && git commit -m "Studio : éditeur markdown moderne avec aperçu fidèle et images collées"`

---

### Task 12 : Formulaires du Studio simplifiés et protégés

**Files:** Create `studio/app/types/resource.ts`, `studio/app/components/ResourceForm.vue`, `studio/app/composables/useEditionConfig.ts` ; Modify `studio/app/components/ResourceManager.vue`, `studio/app/pages/{editions,articles,ateliers,activites,pages,newsletters,categories}.vue`

**Interfaces:**
- Consumes : `MarkdownEditor` (Task 11) ; `isPastEdition`, `findDuplicateYear`, `deleteBlockReason`, `EditionRow` (Task 3).
- Produces :
  - `studio/app/types/resource.ts` :
```ts
export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'markdown' | 'date' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'file' | 'm2o'
  half?: boolean
  required?: boolean
  help?: string
  options?: { value: string, label: string }[]
  refCollection?: string
  refLabelKey?: string
  placeholder?: string
}
export type Row = Record<string, unknown>
export interface ColumnDef {
  key: string
  header: string
  type?: 'image' | 'badge' | 'date' | 'boolean' | 'text' | 'state'
  state?: (row: Row) => { label: string, color: string } | null
}
```
  - `<ResourceForm :fields="FieldDef[]" :form="Row" :ref-options="Record<string, { value: unknown, label: string }[]>" />`
  - `ResourceManager` : nouvelles props `previewPath?: (row: Row) => string | null`, `validate?: (payload: Row, id: number | null) => Promise<string | null>`, `deleteGuard?: (row: Row) => Promise<string | null>`, `rowTo?: (row: Row) => string`, `hideHeader?: boolean`, `extraFields?: string[]` ; `defineExpose({ openCreate(prefill?: Row), openEdit(row: Row), reload })`.
  - `useEditionConfig(opts?: { withEvenement?: boolean }): { editionFields: FieldDef[], editionColumns: ColumnDef[], validate, deleteGuard, previewPath, extraFields: string[] }`

- [ ] **Step 1 : Extraire `ResourceForm.vue`**
  - Créer `types/resource.ts` (ci-dessus) ; dans `ResourceManager.vue`, supprimer les interfaces locales et importer `import type { FieldDef, ColumnDef, Row } from '~/types/resource'`.
  - Déplacer dans `ResourceForm.vue` tout le contenu de `<template #body>` (la grille de `UFormField`), la constante `STATUS` et la fonction `selectItems` ; props `fields`, `form`, `refOptions` ; `useStudio()` pour `assetUrl`, `triggerImageUpload`, `triggerFileUpload`.
  - Le type `markdown` rend `<MarkdownEditor v-model="(form[f.key] as string)" />` ; `textarea` garde `UTextarea`.
  - `UFormField` reçoit `:help="f.help"`.
  - Statuts : `{ value: 'published', label: 'Publié (visible sur le site)' }`, `{ value: 'draft', label: 'Brouillon (non visible)' }`, `{ value: 'archived', label: 'Archivé (masqué)' }`.
  - `ResourceManager` : `<template #body><ResourceForm :fields="fields" :form="form" :ref-options="refOptions" /></template>`.

- [ ] **Step 2 : `ResourceManager.vue`**
  - `load()` : `const fields = ['id', ...props.columns.map(c => c.key).filter(k => k !== 'etat'), ...(props.extraFields || [])]`.
  - `openCreate(prefill?: Row)` : après le préremplissage par `initialFilter`, `if (prefill) Object.assign(form, prefill)`.
  - `save()`, juste avant `if (isCreating.value) await …` :
```ts
    const problem = await props.validate?.(payload, isCreating.value ? null : editing.value!.id as number)
    if (problem) { toast.add({ title: problem, color: 'warning' }); return }
```
  (le `finally` remet déjà `saving` à false). Toast de succès : `payload.status === 'published' ? 'Enregistré : c’est en ligne' : 'Enregistré en brouillon'` (si la collection n'a pas de `status` : `'Enregistré'`).
  - `remove()`, avant le `confirm` :
```ts
  const block = await props.deleteGuard?.({ ...form, id: editing.value.id })
  if (block) { toast.add({ title: 'Suppression impossible', description: block, color: 'warning' }); return }
```
  et message : ``Supprimer définitivement « ${form.title || form.edition_label || props.singularLabel} » ? Cette action est irréversible.``
  - Sélection d'une ligne : ``@select="(r) => props.rowTo ? navigateTo(props.rowTo(r.original)) : openEdit(r)"``.
  - Cellule `state` dans `tableColumns` : `if (c.type === 'state') { const s = c.state?.(row.original); return s ? h(resolveComponent('UBadge'), { color: s.color, variant: 'soft', size: 'sm' }, () => s.label) : null }`.
  - Cellule d'un champ relationnel (valeur objet, ex. `evenement`) : `if (v && typeof v === 'object') return h('span', {}, String((v as Row).title ?? (v as Row).name ?? ''))`.
  - Pied de la slideover, à gauche de « Annuler » : 
```vue
<UButton v-if="!isCreating && previewPath && form.status === 'published' && previewPath(form)" :to="siteUrl + previewPath(form)" target="_blank" variant="soft" icon="i-lucide-external-link">Voir sur le site</UButton>
```
  avec `const siteUrl = useRuntimeConfig().public.siteUrl as string`.
  - `hideHeader` : `v-if="!hideHeader"` sur le bloc titre/description ; le bouton « Ajouter » reste affiché, aligné à droite.
  - `openEdit` charge aussi `extraFields` (pour que `previewPath` ait `evenement.slug`) : `fields: ['id', ...props.fields.map(f => f.key), ...(props.extraFields || [])]`, et après le remplissage du formulaire `for (const k of props.extraFields || []) { const [a, b] = k.split('.'); if (b) form[`${a}_${b}`] = (d[a] as Row | undefined)?.[b] }`, ce qui donne par exemple `form.evenement_slug`.
  - `defineExpose({ openCreate, openEdit, reload: load })`.

- [ ] **Step 3 : `useEditionConfig.ts`**
```ts
import { readItems } from '@directus/sdk'
import type { ColumnDef, FieldDef, Row } from '~/types/resource'
import { isPastEdition, findDuplicateYear, deleteBlockReason, type EditionRow } from '~/utils/editions'

export function useEditionConfig(opts: { withEvenement?: boolean } = {}) {
  const { client } = useDirectusAuth()

  const editionFields: FieldDef[] = [
    ...(opts.withEvenement === false ? [] : [{ key: 'evenement', label: 'Évènement', type: 'm2o', refCollection: 'evenements', refLabelKey: 'title', required: true, half: true } as FieldDef]),
    { key: 'status', label: 'Statut', type: 'select', half: true },
    { key: 'annee', label: 'Année', type: 'number', required: true, half: true, help: 'Une seule édition par année et par évènement.' },
    { key: 'edition_label', label: 'Nom affiché', type: 'text', half: true, help: 'Ex. « Édition 2027 ». Modifiable.' },
    { key: 'date_start', label: 'Date (ou premier jour)', type: 'date', half: true },
    { key: 'date_end', label: 'Dernier jour (si plusieurs jours)', type: 'date', half: true },
    { key: 'lieu', label: 'Lieu, si différent de d’habitude', type: 'text', half: true },
    { key: 'annule', label: 'Édition annulée', type: 'boolean', half: true },
    { key: 'affiche', label: 'Affiche', type: 'image', half: true },
    { key: 'inscription_pdf', label: 'Bulletin d’inscription (PDF)', type: 'file', half: true },
    { key: 'inscription_url', label: 'Lien d’inscription en ligne', type: 'text', help: 'Yapla, HelloAsso… Le bouton S’inscrire disparaît automatiquement après la date.' },
    { key: 'content', label: 'Programme', type: 'markdown' },
    { key: 'resultats', label: 'Bilan / résultats (après l’évènement)', type: 'markdown' }
  ]

  const editionState = (r: Row) => r.annule ? { label: 'Annulée', color: 'error' }
    : isPastEdition(r as EditionRow) ? { label: 'Passée', color: 'neutral' } : { label: 'À venir', color: 'success' }

  const editionColumns: ColumnDef[] = [
    { key: 'affiche', header: '', type: 'image' },
    ...(opts.withEvenement === false ? [] : [{ key: 'evenement', header: 'Évènement' }]),
    { key: 'annee', header: 'Année' },
    { key: 'date_start', header: 'Date', type: 'date' },
    { key: 'etat', header: '', type: 'state', state: editionState },
    { key: 'status', header: 'Statut', type: 'badge' }
  ]

  // evenement.id est indispensable : openEdit convertit les objets { id } en identifiant pour le champ m2o.
  const extraFields = ['annule', 'date_end', 'evenement.id', 'evenement.slug', 'evenement.title']

  const validate = async (p: Row, id: number | null) => {
    const rows = await client.value.request(readItems('editions', {
      filter: { evenement: { _eq: p.evenement as number } },
      fields: ['id', 'evenement', 'annee', 'date_start', 'date_end'],
      limit: -1
    })) as EditionRow[]
    return findDuplicateYear(rows, { ...(p as EditionRow), id: id ?? undefined })
      ? `Il existe déjà une édition ${p.annee} pour cet évènement.`
      : null
  }

  const deleteGuard = async (row: Row) => deleteBlockReason('editions', row)
  const previewPath = (r: Row) => (r.evenement_slug && r.annee ? `/evenements/${r.evenement_slug}/${r.annee}` : null)

  return { editionFields, editionColumns, validate, deleteGuard, previewPath, extraFields }
}
```
Note : la colonne `evenement` affiche `evenement.title` grâce à `extraFields` (la valeur lue est l'objet `{ slug, title }`), et `annee` est remplacée en création par `nextEditionDraft` ou saisie. Lors de la création d'une édition, préremplir `edition_label` à partir de l'année : dans `ResourceForm`, si `form.edition_label` est vide et que `annee` change, ``form.edition_label = `Édition ${annee}` `` (watch limité au cas où le champ `edition_label` existe).

- [ ] **Step 4 : Pages**
  - `editions.vue` :
```vue
<script setup lang="ts">
const route = useRoute()
const evFilter = route.query.evenement ? { evenement: { _eq: Number(route.query.evenement) } } : undefined
const { editionFields, editionColumns, validate, deleteGuard, previewPath, extraFields } = useEditionConfig()
</script>
<template>
  <ResourceManager
    collection="editions" title="Toutes les éditions" singular-label="édition"
    description="Pour préparer une nouvelle édition, passez plutôt par la fiche de l’évènement."
    :fields="editionFields" :columns="editionColumns" :default-sort="['-annee']" :initial-filter="evFilter"
    :validate="validate" :delete-guard="deleteGuard" :preview-path="previewPath" :extra-fields="extraFields"
  />
</template>
```
  - `articles.vue`, `ateliers.vue`, `activites.vue`, `pages.vue`, `newsletters.vue`, `categories.vue` : retirer tout champ `sort` ; renommer le champ `slug` en `{ key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'Fin de l’adresse web, générée depuis le titre. À ne pas modifier après publication.' }` ; supprimer « (markdown) » des libellés ; ajouter `:preview-path` : articles ``(r) => `/blog/${r.slug}` ``, ateliers ``(r) => `/ateliers/${r.slug}` ``, activités ``(r) => `/activites/${r.slug}` ``, pages ``(r) => `/${r.slug}` ``.
  - `default-sort` qui citait `sort` : remplacer par `['title']` (ou `['-date']` pour articles et newsletters).

- [ ] **Step 5 : Vérifier** (Studio lancé, connecté avec un compte Éditeur de test)
  - Éditeur markdown : gras, titre, liste, lien ; coller une capture d'écran → image visible dans l'aperçu et sur le site après enregistrement ; onglets Écrire/Aperçu en largeur mobile ; plein écran ; couper Directus (`docker compose stop directus`), coller une image → toast d'erreur, texte conservé ; relancer Directus.
  - Créer une édition 2025 pour l'Hivernale → refus « Il existe déjà une édition 2025 pour cet évènement. ».
  - Supprimer l'édition 2024 de l'Hivernale → refus avec l'explication sur les archives.
  - Modifier un article publié, cliquer « Voir sur le site » → la modification est visible en moins d'une minute.

- [ ] **Step 6 : Commit** : `git add studio/app && git commit -m "Studio : formulaires clairs, éditeur markdown, doublons et suppressions protégés"`

---

### Task 13 : Fiche évènement en hub et « Préparer l'édition suivante »

**Files:** Move `studio/app/pages/evenements.vue` → `studio/app/pages/evenements/index.vue` ; Create `studio/app/pages/evenements/[id].vue` ; Modify `studio/app/layouts/default.vue`

**Interfaces:**
- Consumes : `ResourceForm`, `ResourceManager` (`openCreate(prefill)`, `hideHeader`, `initialFilter`, `validate`, `deleteGuard`, `previewPath`, `extraFields`, `rowTo`), `useEditionConfig({ withEvenement: false })` (Task 12) ; `nextEditionDraft`, `deleteBlockReason`, `EditionRow` (Task 3).

- [ ] **Step 1 : Liste** : `git mv studio/app/pages/evenements.vue studio/app/pages/evenements/index.vue`, retirer le champ `sort`, `:default-sort="['title']"`, ajouter ``:row-to="(r) => `/evenements/${r.id}`"`` et la description « Cliquez sur un évènement pour modifier sa présentation et gérer ses éditions. ».

- [ ] **Step 2 : Hub** `studio/app/pages/evenements/[id].vue`
```vue
<script setup lang="ts">
import { readItem, readItems, updateItem, deleteItem, aggregate } from '@directus/sdk'
import type { FieldDef, Row } from '~/types/resource'
import { nextEditionDraft, deleteBlockReason, type EditionRow } from '~/utils/editions'

const route = useRoute()
const id = Number(route.params.id)
const { client } = useDirectusAuth()
const { toast } = useStudio()
const siteUrl = useRuntimeConfig().public.siteUrl as string
const { editionFields, editionColumns, validate, deleteGuard, previewPath, extraFields } = useEditionConfig({ withEvenement: false })

const fields: FieldDef[] = [
  { key: 'title', label: 'Nom de l’évènement', type: 'text', required: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'lieu_defaut', label: 'Lieu habituel', type: 'text', half: true },
  { key: 'recurrence', label: 'Quand ?', type: 'text', half: true, help: 'Ex. « chaque 2ᵉ dimanche de mars »' },
  { key: 'description', label: 'Présentation (commune à toutes les éditions)', type: 'markdown' },
  { key: 'image', label: 'Image', type: 'image', half: true },
  { key: 'reglement', label: 'Règlement (PDF)', type: 'file', half: true },
  { key: 'featured', label: 'Mettre en avant sur l’accueil', type: 'boolean', half: true },
  { key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'À ne pas modifier : les liens existants casseraient.' }
]

const form = reactive<Row>({})
const refOptions = reactive<Record<string, { value: unknown, label: string }[]>>({})
const saving = ref(false)
const editionsRm = ref<{ openCreate: (p?: Row) => void, reload: () => Promise<void> } | null>(null)
const lastEdition = ref<EditionRow | null>(null)
const nextYear = computed(() => nextEditionDraft(lastEdition.value, id).annee)

async function loadLast() {
  const [last] = await client.value.request(readItems('editions', { filter: { evenement: { _eq: id } }, sort: ['-annee'], limit: 1, fields: ['*'] })) as EditionRow[]
  lastEdition.value = last ?? null
}

onMounted(async () => {
  const ev = await client.value.request(readItem('evenements', id, { fields: fields.map(f => f.key) })) as Row
  Object.assign(form, ev, { category: (ev.category as Row | null)?.id ?? ev.category })
  const cats = await client.value.request(readItems('categories', { fields: ['id', 'name'], sort: ['name'], limit: -1 })) as { id: number, name: string }[]
  refOptions.category = cats.map(c => ({ value: c.id, label: c.name }))
  await loadLast()
})

async function save() {
  if (!String(form.title || '').trim()) return toast.add({ title: 'Le nom est requis', color: 'warning' })
  saving.value = true
  try {
    await client.value.request(updateItem('evenements', id, Object.fromEntries(fields.map(f => [f.key, form[f.key] === '' ? null : form[f.key] ?? null]))))
    toast.add({ title: form.status === 'published' ? 'Enregistré : c’est en ligne' : 'Enregistré en brouillon', color: 'success' })
  } catch {
    toast.add({ title: 'Échec de l’enregistrement', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function prepareNext() {
  await loadLast()
  editionsRm.value?.openCreate(nextEditionDraft(lastEdition.value, id))
}

async function removeEvent() {
  const [res] = await client.value.request(aggregate('editions', { aggregate: { count: '*' }, query: { filter: { evenement: { _eq: id } } } })) as { count: number | string }[]
  const block = deleteBlockReason('evenements', form, { editionsCount: Number(res?.count ?? 0) })
  if (block) return toast.add({ title: 'Suppression impossible', description: block, color: 'warning' })
  if (!confirm(`Supprimer définitivement « ${form.title} » ? Cette action est irréversible.`)) return
  await client.value.request(deleteItem('evenements', id))
  navigateTo('/evenements')
}
</script>

<template>
  <div class="space-y-10">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UButton to="/evenements" variant="ghost" color="neutral" icon="i-lucide-arrow-left">Évènements</UButton>
      <div class="flex gap-2">
        <UButton v-if="form.status === 'published'" :to="`${siteUrl}/evenements/${form.slug}`" target="_blank" variant="soft" icon="i-lucide-external-link">Voir sur le site</UButton>
        <UButton variant="ghost" color="error" icon="i-lucide-trash-2" @click="removeEvent">Supprimer</UButton>
        <UButton :loading="saving" @click="save">Enregistrer</UButton>
      </div>
    </div>

    <section>
      <h1 class="text-2xl font-bold mb-4">{{ form.title }}</h1>
      <ResourceForm :fields="fields" :form="form" :ref-options="refOptions" />
    </section>

    <section>
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 class="text-xl font-semibold">Éditions</h2>
          <p class="text-sm text-gray-500">L’édition à venir est mise en avant sur le site ; les précédentes restent consultables en archive.</p>
        </div>
        <UButton icon="i-lucide-copy-plus" @click="prepareNext">Préparer l’édition {{ nextYear }}</UButton>
      </div>
      <ResourceManager
        ref="editionsRm" hide-header collection="editions" title="Éditions" singular-label="édition"
        :fields="editionFields" :columns="editionColumns" :default-sort="['-annee']"
        :initial-filter="{ evenement: { _eq: id } }" :validate="validate" :delete-guard="deleteGuard"
        :extra-fields="extraFields" :preview-path="previewPath"
      />
    </section>
  </div>
</template>
```
Après la création d'une édition, `lastEdition` doit être rafraîchi : appeler `loadLast()` sur l'évènement `saved` de `ResourceManager` (ajouter `const emit = defineEmits<{ saved: [] }>()` dans `ResourceManager` et `emit('saved')` après un enregistrement réussi, puis `@saved="loadLast"` ici).

- [ ] **Step 3 : Navigation** (`default.vue`) : retirer « Éditions » du menu (l'accès passe par l'évènement) ; la page `/editions` reste accessible depuis le tableau de bord (Task 14).

- [ ] **Step 4 : Vérifier**
  - Ouvrir l'Hivernale : présentation + éditions 2026 (Passée), 2025 (Passée), 2024 (Annulée).
  - « Préparer l’édition 2027 » : slideover prérempli (lieu, programme), dates vides, statut Brouillon ; enregistrer.
  - Site : l'Hivernale montre toujours 2026 (le brouillon est invisible).
  - Publier 2027 avec la date 2027-03-14 : sur le site (après ≤ 60 s) 2027 passe en tête et 2026 rejoint « Éditions précédentes ».
  - Remettre 2027 en brouillon puis le supprimer (autorisé : édition future).
  - Tenter de supprimer l'évènement → refus « Cet évènement a 3 édition(s) ».

- [ ] **Step 5 : Commit** : `git add studio/app && git commit -m "Studio : fiche évènement avec ses éditions et bouton Préparer l'édition suivante"`

---

### Task 14 : Tableau de bord, « Accueil du site », comptes

**Files:** Modify `studio/app/composables/useDirectusAuth.js`, `studio/app/pages/index.vue`, `studio/app/pages/articles.vue`, `studio/app/layouts/default.vue` ; Create `studio/app/pages/accueil.vue`, `studio/app/pages/comptes.vue`

**Interfaces:**
- Consumes : `ResourceForm`, `ResourceManager` (`openCreate`, `openEdit`, `reload`) (Task 12) ; rôle `Éditeur` sans accès à `/roles` (Task 1).
- Produces : `useDirectusAuth().canManageUsers: Ref<boolean>`.

- [ ] **Step 1 : Droit admin** (`useDirectusAuth.js`) : importer `readRoles`, puis dans `useDirectusAuth` :
```js
  const canManageUsers = useState('directus-can-manage-users', () => false)
  const checkAdmin = async () => {
    try { await client.value.request(readRoles({ limit: 1, fields: ['id'] })); canManageUsers.value = true }
    catch { canManageUsers.value = false }
  }
```
Dans `fetchUser`, après l'affectation réussie de `user.value` : `await checkAdmin()`. Dans `logout` : `canManageUsers.value = false`. Ajouter `canManageUsers` à l'objet retourné.

- [ ] **Step 2 : Tableau de bord** (`index.vue`) : remplacer la grille de compteurs par trois blocs, en gardant les compteurs en petit tout en bas.
```ts
import { readItems, aggregate } from '@directus/sdk'
const { client } = useDirectusAuth()
const today = new Date().toISOString().slice(0, 10)
const upcoming = ref<Record<string, any>[]>([])
const drafts = ref<{ kind: string, label: string, to: string }[]>([])
const latest = ref<Record<string, any>[]>([])

onMounted(async () => {
  upcoming.value = await client.value.request(readItems('editions', { filter: { date_start: { _gte: today } }, sort: ['date_start'], limit: 5, fields: ['id', 'annee', 'date_start', 'status', 'evenement.id', 'evenement.title'] })) as Record<string, any>[]
  const dEd = await client.value.request(readItems('editions', { filter: { status: { _eq: 'draft' } }, limit: 5, fields: ['annee', 'evenement.id', 'evenement.title'] })) as Record<string, any>[]
  const dAr = await client.value.request(readItems('articles', { filter: { status: { _eq: 'draft' } }, limit: 5, sort: ['-date'], fields: ['id', 'title'] })) as Record<string, any>[]
  drafts.value = [
    ...dEd.map(e => ({ kind: 'Édition', label: `${e.evenement?.title} ${e.annee}`, to: `/evenements/${e.evenement?.id}` })),
    ...dAr.map(a => ({ kind: 'Article', label: a.title, to: '/articles' }))
  ]
  latest.value = await client.value.request(readItems('articles', { sort: ['-date'], limit: 5, fields: ['id', 'title', 'date', 'status'] })) as Record<string, any>[]
  // compteurs existants : garder la boucle actuelle sur `cards` et `aggregate`
})
```
  - Raccourcis en haut : « Nouvel article » (`/articles?nouveau=1`, icône `i-lucide-plus`), « Évènements » (`/evenements`), « Accueil du site » (`/accueil`), « Toutes les éditions » (`/editions`).
  - « Prochaines éditions » : une ligne par édition (date formatée en français, titre, badge « Brouillon » si `status === 'draft'`), lien vers `/evenements/<evenement.id>`. Si vide : « Aucune édition datée à venir. Pensez à préparer les prochaines depuis la fiche des évènements. »
  - « Brouillons en cours » : liste `drafts` ; si vide : « Aucun brouillon. ».
  - « Derniers articles » : titre, date, badge statut.
  - `articles.vue` : `const rm = ref()` sur `ResourceManager`, et `onMounted(() => { if (useRoute().query.nouveau) rm.value?.openCreate() })`.

- [ ] **Step 3 : `accueil.vue`**
  - Formulaire du singleton (`readSingleton('site_parameters')` puis `updateSingleton`) avec `ResourceForm` et ces champs :
```ts
const fields: FieldDef[] = [
  { key: 'bandeau_texte', label: 'Bouton mis en avant', type: 'text', half: true, help: 'Ex. « Inscriptions aux ateliers 2026-2027 ». Laisser vide pour le masquer.' },
  { key: 'bandeau_lien', label: 'Lien du bouton', type: 'text', half: true, help: 'Ex. /inscriptions' },
  { key: 'devise', label: 'Devise (au-dessus du titre)', type: 'text' },
  { key: 'hero_subtitle', label: 'Phrase d’accueil', type: 'textarea' },
  { key: 'asso_titre', label: 'Titre de la présentation', type: 'text', half: true },
  { key: 'asso_image', label: 'Photo de la présentation', type: 'image', half: true },
  { key: 'asso_texte', label: 'Présentation de l’association', type: 'markdown' },
  { key: 'ateliers_texte', label: 'Introduction des ateliers', type: 'markdown' },
  { key: 'newsletter_texte', label: 'Texte de la liste de diffusion', type: 'markdown' }
]
```
  Enregistrer n'envoie que ces clés (`Object.fromEntries(fields.map(f => [f.key, form[f.key] || null]))`).
  - Carrousel, sous le formulaire : liste propre à la page.
```ts
const slides = ref<Row[]>([])
const rm = ref()
const loadSlides = async () => { slides.value = await client.value.request(readItems('accueil_slides', { sort: ['sort'], fields: ['id', 'title', 'image', 'lien', 'sort'] })) as Row[] }
async function move(i: number, dir: -1 | 1) {
  const a = slides.value[i]!, b = slides.value[i + dir]
  if (!b) return
  await client.value.request(updateItem('accueil_slides', a.id as number, { sort: b.sort }))
  await client.value.request(updateItem('accueil_slides', b.id as number, { sort: a.sort }))
  await loadSlides()
}
```
  Affichage : la page montre la liste maison `slides` (une ligne par slide : miniature, titre, boutons ↑ `i-lucide-arrow-up` désactivé en première position, ↓ désactivé en dernière, « Modifier » qui appelle `rm.value.openEdit(slide)`). En dessous, un `ResourceManager` avec `hide-header` fournit le bouton « Ajouter », la slideover et la suppression : `collection="accueil_slides"`, colonnes `image`, `title`, champs `image` (image), `title` (texte), `lien` (texte, aide « Optionnel, ex. /evenements/hivernale »), `:validate="validateSlide"`, `@saved="loadSlides"`. Un nouveau slide est placé en dernier : `validate` reçoit `payload` par référence et le complète.
```ts
const validateSlide = async (p: Row, id: number | null) => {
  if (!p.image) return 'Choisissez une image.'
  if (id === null) p.sort = Math.max(0, ...slides.value.map(s => Number(s.sort) || 0)) + 1
  return null
}
```

- [ ] **Step 4 : `comptes.vue`** (réservé à l'admin)
```ts
import { readUsers, createUser, updateUser, readRoles } from '@directus/sdk'
const { client, canManageUsers } = useDirectusAuth()
const { toast } = useStudio()
if (!canManageUsers.value) await navigateTo('/')

const roleId = ref<string | null>(null)
const users = ref<Record<string, any>[]>([])
const revealed = ref<{ email: string, password: string } | null>(null)
const draft = reactive({ first_name: '', last_name: '', email: '' })
const genPassword = () => crypto.randomUUID().replace(/-/g, '').slice(0, 14)

async function load() {
  const [role] = await client.value.request(readRoles({ filter: { name: { _eq: 'Éditeur' } }, fields: ['id'] })) as { id: string }[]
  roleId.value = role?.id ?? null
  users.value = roleId.value ? await client.value.request(readUsers({ filter: { role: { _eq: roleId.value } }, fields: ['id', 'first_name', 'last_name', 'email', 'status', 'last_access'] })) as Record<string, any>[] : []
}
async function addEditor() {
  const password = genPassword()
  try {
    await client.value.request(createUser({ ...draft, password, role: roleId.value }))
    revealed.value = { email: draft.email, password }
    Object.assign(draft, { first_name: '', last_name: '', email: '' })
    await load()
  } catch { toast.add({ title: 'Création impossible (email déjà utilisé ?)', color: 'error' }) }
}
async function resetPassword(u: Record<string, any>) {
  const password = genPassword()
  await client.value.request(updateUser(u.id, { password }))
  revealed.value = { email: u.email, password }
}
async function toggle(u: Record<string, any>) {
  const next = u.status === 'active' ? 'suspended' : 'active'
  if (next === 'suspended' && !confirm(`Désactiver le compte de ${u.email} ?`)) return
  await client.value.request(updateUser(u.id, { status: next }))
  await load()
}
onMounted(load)
```
  Template : formulaire « Ajouter un éditeur » (prénom, nom, email, bouton) ; tableau (nom, email, dernière connexion, statut, boutons « Nouveau mot de passe » et « Désactiver / Réactiver ») ; si `revealed`, un encadré « Mot de passe de {email} : {password} (à transmettre, il ne sera plus affiché) » avec un bouton Copier (`navigator.clipboard.writeText`).

- [ ] **Step 5 : Menu** (`default.vue`) : passer `items` en `computed` ; section Contenu : ajouter « Accueil du site » (`i-lucide-house`, `/accueil`) ; section Réglages : renommer « Paramètres du site » en « Logo et coordonnées », ajouter « Comptes » (`i-lucide-users`, `/comptes`) seulement si `canManageUsers.value`.

- [ ] **Step 6 : Vérifier** : en admin, créer un éditeur test ; s'y connecter : pas d'entrée « Comptes », `/comptes` renvoie au tableau de bord ; modifier le bouton mis en avant et l'ordre du carrousel depuis « Accueil du site » → visibles sur le site en moins d'une minute ; tableau de bord avec prochaines éditions (Lyricantrail 2026) ; revenir en admin et désactiver l'éditeur test.

- [ ] **Step 7 : Commit** : `git add studio/app && git commit -m "Studio : tableau de bord, accueil du site éditable, gestion des comptes"`

---

### Task 15 : Déploiement sur le VPS (beta)

**Files:** Modify `ecosystem.config.cjs`, `docker-compose.yml`, `.env.example` ; Create `deploy/nginx/larchant.conf`, `deploy/backup.sh`

- [ ] **Step 1 : Configuration**
  - `ecosystem.config.cjs` : `PORT: 13010` (site), `PORT: 13011` (Studio), et dans les deux `env` : `NUXT_PUBLIC_SITE_URL: 'https://beta.larchantanimation.fr'`.
  - `docker-compose.yml`, service `directus` : `CORS_ORIGIN: "http://localhost:13010,http://localhost:13011,https://beta.larchantanimation.fr,https://studio.larchantanimation.fr"` et ajouter `FILES_MAX_UPLOAD_SIZE: "20mb"`.
  - `.env.example` : ajouter `NUXT_PUBLIC_SITE_URL=http://localhost:13010` et, en commentaire, `# Prod : DIRECTUS_PUBLIC_URL=https://api.larchantanimation.fr`.

- [ ] **Step 2 : `deploy/nginx/larchant.conf`**
```nginx
server {
  listen 80;
  server_name beta.larchantanimation.fr;
  location / { proxy_pass http://127.0.0.1:13010; include /etc/nginx/proxy_params; }
}
server {
  listen 80;
  server_name studio.larchantanimation.fr;
  client_max_body_size 25m;
  location / { proxy_pass http://127.0.0.1:13011; include /etc/nginx/proxy_params; }
}
server {
  listen 80;
  server_name api.larchantanimation.fr;
  client_max_body_size 25m;
  location / { proxy_pass http://127.0.0.1:18056; include /etc/nginx/proxy_params; }
}
```

- [ ] **Step 3 : `deploy/backup.sh`**
```bash
#!/usr/bin/env bash
# Sauvegarde quotidienne : dump Postgres + médias Directus, conservation 14 jours.
set -euo pipefail
cd /root/larchant-animation
DEST=/root/backups/larchant
mkdir -p "$DEST"
STAMP=$(date +%F)
set -a; . ./.env; set +a
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DEST/db-$STAMP.sql.gz"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C directus uploads
find "$DEST" -type f -mtime +14 -delete
```
Commit et push :
```bash
chmod +x deploy/backup.sh
git add ecosystem.config.cjs docker-compose.yml .env.example deploy
git commit -m "Déploiement : ports 13010/13011, nginx, sauvegarde quotidienne"
git push -u origin refonte-directus
```

- [ ] **Step 4 : DNS (CHECKPOINT Quentin)**
  - Lister : `~/.local/bin/ovhcloud domain-zone record list larchantanimation.fr -o json < /dev/null`. Si « API client not initialized », demander à Quentin de lancer `! ovhcloud login` (région EU).
  - Vérifier qu'il n'existe aucun enregistrement `beta`, `studio`, `api` (sinon s'arrêter et en parler).
  - Lire la syntaxe exacte : `~/.local/bin/ovhcloud domain-zone record create --help < /dev/null`.
  - **Montrer les 3 commandes de création (A, TTL 3600, cible 109.176.199.51) et la commande `refresh`, puis attendre l'accord explicite de Quentin** avant de les exécuter. Forme attendue (à adapter aux options réelles du `--help`) :
```bash
~/.local/bin/ovhcloud domain-zone record create larchantanimation.fr --field-type A --sub-domain beta   --target 109.176.199.51 --ttl 3600 < /dev/null
~/.local/bin/ovhcloud domain-zone record create larchantanimation.fr --field-type A --sub-domain studio --target 109.176.199.51 --ttl 3600 < /dev/null
~/.local/bin/ovhcloud domain-zone record create larchantanimation.fr --field-type A --sub-domain api    --target 109.176.199.51 --ttl 3600 < /dev/null
~/.local/bin/ovhcloud domain-zone refresh larchantanimation.fr < /dev/null
```
  - Vérifier : `dig +short beta.larchantanimation.fr studio.larchantanimation.fr api.larchantanimation.fr` → trois fois `109.176.199.51`.

- [ ] **Step 5 : Installation** (`ssh hostinger-KVM`)
```bash
ss -ltnp | grep -E ':(13010|13011|18056|54322)\b' && echo "PORT OCCUPÉ : STOP" || echo "ports libres"
git clone -b refonte-directus https://github.com/quentinglorieux/larchant-animation.git /root/larchant-animation
cd /root/larchant-animation && cp .env.example .env && chmod 600 .env
```
Remplir `.env` : `POSTGRES_PASSWORD=$(openssl rand -hex 24)`, `DIRECTUS_SECRET=$(openssl rand -hex 32)`, `DIRECTUS_ADMIN_PASSWORD=$(openssl rand -hex 16)` (le transmettre à Quentin), `DIRECTUS_PUBLIC_URL=https://api.larchantanimation.fr`, `NUXT_PUBLIC_DIRECTUS_URL=https://api.larchantanimation.fr`, `NUXT_PUBLIC_SITE_URL=https://beta.larchantanimation.fr`. Puis :
```bash
docker compose up -d && until curl -sf http://127.0.0.1:18056/server/health; do sleep 2; done
cp deploy/nginx/larchant.conf /etc/nginx/sites-available/larchant
ln -s /etc/nginx/sites-available/larchant /etc/nginx/sites-enabled/larchant
nginx -t && systemctl reload nginx
certbot --nginx -d beta.larchantanimation.fr -d studio.larchantanimation.fr -d api.larchantanimation.fr
curl -s https://api.larchantanimation.fr/server/health
```
Expected : `{"status":"ok"}` en HTTPS.

- [ ] **Step 6 : Contenu** (sur le VPS ; Node 22 via nvm comme pour IMAP)
```bash
cd /root/larchant-animation/migration && npm ci && npm run schema && npm run permissions && npm run migrate && npm run review
git diff --stat editions-review.md
```
Expected : `editions-review.md` identique à la version validée en local (diff vide).

- [ ] **Step 7 : Build et PM2**
```bash
cd /root/larchant-animation
export NUXT_PUBLIC_DIRECTUS_URL=https://api.larchantanimation.fr NUXT_PUBLIC_SITE_URL=https://beta.larchantanimation.fr
(cd site && npm ci && npm run build) && (cd studio && npm ci && npm run build)
pm2 start ecosystem.config.cjs && pm2 save
curl -so /dev/null -w "%{http_code}\n" https://beta.larchantanimation.fr/
```
Expected : `200`. Si le build échoue par manque de mémoire (cas déjà rencontré sur un autre VPS), builder en local avec les mêmes variables puis `rsync -a site/.output studio/.output` vers le VPS et relancer `pm2 restart larchant-site larchant-studio`.
Le `ROOT` de `ecosystem.config.cjs` vaut déjà `/root/larchant-animation`.

- [ ] **Step 8 : Sauvegarde**
```bash
(crontab -l 2>/dev/null; echo "30 3 * * * /root/larchant-animation/deploy/backup.sh >> /var/log/larchant-backup.log 2>&1") | crontab -
/root/larchant-animation/deploy/backup.sh && ls -lh /root/backups/larchant
```
Expected : `db-<date>.sql.gz` et `uploads-<date>.tar.gz` non vides.

- [ ] **Step 9 : Comptes** : depuis `https://studio.larchantanimation.fr/comptes` (connecté en admin), créer les comptes éditeurs dont Quentin fournit les noms et emails ; lui transmettre les mots de passe affichés.

---

### Task 16 : Vérification post-migration

**Files:** Create `migration/verify.mjs` ; Modify `migration/package.json`

- [ ] **Step 1 : `migration/verify.mjs`**, script `"verify": "node verify.mjs"` :
```js
// Vérifie : comptes par collection, médias référencés présents, toutes les anciennes URLs en 200 ou 301 → 200.
import { readdirSync } from 'node:fs'
import { api } from './lib/directus.mjs'

const SITE = (process.argv[2] || 'http://localhost:13010').replace(/\/$/, '')
let failures = 0
const fail = (m) => { failures++; console.log('  ✗', m) }
const mdCount = (dir) => readdirSync(new URL(`../content/${dir}`, import.meta.url)).filter((f) => f.endsWith('.md')).length
const count = async (c) => Number((await api.get(`/items/${c}?aggregate[count]=*`))[0].count)

console.log('[comptes]')
const expectedArticles = mdCount('posts') + mdCount('news')
const nArticles = await count('articles')
if (nArticles !== expectedArticles) fail(`articles : ${nArticles} en base, ${expectedArticles} fichiers`)
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
```

- [ ] **Step 2 : En local** : `cd migration && npm run verify -- http://localhost:13010` → `✅ Tout est bon`. Corriger chaque problème remonté (redirection manquante dans `redirects-manual.json` puis `npm run redirects`, média absent) avant de continuer.

- [ ] **Step 3 : Sur la beta** : `npm run verify -- https://beta.larchantanimation.fr` (avec `DIRECTUS_PUBLIC_URL=https://api.larchantanimation.fr` dans l'environnement) → `✅ Tout est bon`.

- [ ] **Step 4 : Tous les tests unitaires**
```bash
(cd site && npm test) && (cd studio && npm test) && (cd migration && npm test)
```
Expected : tout PASS.

- [ ] **Step 5 : Recette Éditeur sur la beta** (compte Éditeur, cocher chaque point) :
  - modifier l'atelier Yoga et le voir sur le site ;
  - créer et publier un article avec une image collée ;
  - préparer un brouillon 2027 pour la Foire aux plantes, puis le supprimer ;
  - sur téléphone : accueil, page Hivernale, archive Hivernale 2024, menu ;
  - formulaire de contact avec le sujet « TEST refonte » (prévenir Quentin).

- [ ] **Step 6 : Commit et push** : `git add migration/verify.mjs migration/package.json && git commit -m "Migration : script de vérification post-déploiement" && git push`

- [ ] **Step 7 : CHECKPOINT Quentin** : présenter les URLs (`https://beta.larchantanimation.fr`, `https://studio.larchantanimation.fr`), le résultat de `verify` et la recette, et lui demander s'il veut `Disallow: /` dans `robots.txt` tant que le site reste en beta. La bascule de `larchantanimation.fr` et la suppression de l'ancien site Hugo (`content/`, `layouts/`, `static/admin`, `netlify.toml`, `vercel.toml`) sont **hors de ce plan** : elles se feront sur décision explicite, dans un plan séparé.
