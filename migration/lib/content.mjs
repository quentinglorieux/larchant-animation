// Fonctions pures partagées par migrate.mjs, redirects.mjs (testées dans content.test.mjs).
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

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
  if (!date) return null
  const parsed = date instanceof Date ? date : new Date(String(date))
  if (Number.isNaN(parsed.getTime())) return null
  const iso = parsed.toISOString()
  if (iso.startsWith('2023-01-01')) return null
  return parsed.getUTCFullYear()
}

// Comme urlize de Hugo : minuscules, espaces en tirets, on ne garde que lettres, chiffres, marques et - _ . /
export function hugoUrlize(path) {
  return path.normalize('NFC').toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\p{M}\-_./]/gu, '')
}

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  svg: 'image/svg+xml', avif: 'image/avif', pdf: 'application/pdf', gpx: 'application/gpx+xml' }
export const mimeFor = (f) => MIME[f.split('.').pop().toLowerCase()] || 'application/octet-stream'
