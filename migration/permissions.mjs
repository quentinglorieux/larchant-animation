// Accorde la lecture publique (rôle Public) aux collections de contenu + fichiers.
// Idempotent. Lancer : node migration/permissions.mjs
import { api } from './lib/directus.mjs'

// Collections avec un champ `status` → on ne publie que `published`.
const WITH_STATUS = ['evenements', 'editions', 'articles', 'ateliers', 'activites', 'newsletters', 'pages']
// Collections sans status → lecture libre.
const OPEN = ['categories', 'site_parameters', 'infos_generales', 'articles_evenements', 'articles_editions', 'directus_files']

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

async function main() {
  const policy = await publicPolicyId()
  console.log(`Permissions publiques (policy ${policy})`)
  for (const c of WITH_STATUS) await ensureRead(policy, c, { status: { _eq: 'published' } })
  for (const c of OPEN) await ensureRead(policy, c, {})
  console.log('\n✅ Lecture publique configurée.')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
