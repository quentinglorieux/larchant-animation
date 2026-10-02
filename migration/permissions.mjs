// Accorde la lecture publique (rôle Public) aux collections de contenu + fichiers.
// Idempotent. Lancer : node migration/permissions.mjs
import { api } from './lib/directus.mjs'

// Collections avec un champ `status` → on ne publie que `published`.
const WITH_STATUS = ['evenements', 'editions', 'articles', 'ateliers', 'activites', 'newsletters', 'pages']
// Collections sans status → lecture libre.
const OPEN = ['categories', 'accueil_slides', 'site_parameters', 'infos_generales', 'articles_evenements', 'articles_editions', 'directus_files']

async function publicPolicyId() {
  const pols = await api.get('/policies?fields=id,name,admin_access')
  const pub = pols.find(p => p.name === '$t:public_label') || pols.find(p => !p.admin_access)
  if (!pub) throw new Error('Policy publique introuvable')
  return pub.id
}

async function ensureRead(policy, collection, filter) {
  const existing = await api.get(
    `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${collection}&filter[action][_eq]=read&limit=1&fields=id`
  )
  const payload = { policy, collection, action: 'read', fields: ['*'], permissions: filter || {} }
  if (existing?.length) { await api.patch(`/permissions/${existing[0].id}`, payload); console.log(`  = ${collection}`) }
  else { await api.post('/permissions', payload); console.log(`  + ${collection}`) }
}

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

async function main() {
  const policy = await publicPolicyId()
  console.log(`Permissions publiques (policy ${policy})`)
  for (const c of WITH_STATUS) await ensureRead(policy, c, { status: { _eq: 'published' } })
  for (const c of OPEN) await ensureRead(policy, c, {})
  console.log('\n✅ Lecture publique configurée.')
  await ensureEditorRole()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
