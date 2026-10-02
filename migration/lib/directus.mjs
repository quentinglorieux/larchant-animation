// Petit client REST Directus pour les scripts one-shot (schéma + migration).
// Utilise fetch natif (Node >= 18). Idempotent par construction côté appelant.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charge .env de la racine du repo (../../.env) sans dépendance.
function loadEnv() {
  const envPath = resolve(__dirname, '../../.env')
  let raw = ''
  try { raw = readFileSync(envPath, 'utf8') } catch { /* pas de .env */ }
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return { ...env, ...process.env }
}

const env = loadEnv()
export const DIRECTUS_URL = (env.DIRECTUS_PUBLIC_URL || 'http://localhost:18056').replace(/\/$/, '')
const ADMIN_EMAIL = env.DIRECTUS_ADMIN_EMAIL
const ADMIN_PASSWORD = env.DIRECTUS_ADMIN_PASSWORD

let _token = null

export async function login() {
  if (_token) return _token
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login échoué (${res.status}): ${await res.text()}`)
  const json = await res.json()
  _token = json.data.access_token
  return _token
}

async function req(method, path, body, isForm = false) {
  const token = await login()
  const headers = { Authorization: `Bearer ${token}` }
  let payload = body
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${DIRECTUS_URL}${path}`, { method, headers, body: payload })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json?.errors || json)}`)
    err.status = res.status
    err.body = json
    throw err
  }
  return json?.data ?? json
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  patch: (p, b) => req('PATCH', p, b),
  delete: (p) => req('DELETE', p),
  // Upload d'un fichier (FormData) vers /files
  async upload(buffer, filename, mimetype, extra = {}) {
    const token = await login()
    const form = new FormData()
    for (const [k, v] of Object.entries(extra)) form.append(k, v)
    form.append('file', new Blob([buffer], { type: mimetype }), filename)
    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Upload échoué ${filename} (${res.status}): ${await res.text()}`)
    return (await res.json()).data
  },
}

// --- Helpers idempotents de schéma ---

export async function collectionExists(name) {
  try { await api.get(`/collections/${name}`); return true }
  catch (e) { if (e.status === 403 || e.status === 404) return false; throw e }
}

export async function fieldExists(collection, field) {
  try { await api.get(`/fields/${collection}/${field}`); return true }
  catch (e) { if (e.status === 403 || e.status === 404) return false; throw e }
}

export async function ensureCollection(def) {
  if (await collectionExists(def.collection)) {
    console.log(`  = collection ${def.collection} (existe)`)
    return
  }
  await api.post('/collections', def)
  console.log(`  + collection ${def.collection}`)
}

export async function ensureField(collection, def) {
  if (await fieldExists(collection, def.field)) {
    console.log(`    = ${collection}.${def.field} (existe)`)
    return
  }
  await api.post(`/fields/${collection}`, def)
  console.log(`    + ${collection}.${def.field}`)
}

export async function ensureRelation(def) {
  const relations = await api.get(`/relations/${def.collection}`)
  if (Array.isArray(relations) && relations.some((r) => r.field === def.field)) {
    console.log(`    = relation ${def.collection}.${def.field} (existe)`)
    return
  }
  await api.post('/relations', def)
  console.log(`    + relation ${def.collection}.${def.field} → ${def.related_collection}`)
}
