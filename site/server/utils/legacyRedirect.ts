// Anciennes URLs Hugo reçues en majuscules ou en Unicode décomposé (NFD) : les route rules
// de nuxt.config.ts ne les reconnaissent pas, on les retrouve ici sous une forme normalisée.
export const normalizeLegacyPath = (p: string) => p.normalize('NFC').toLowerCase()

export function buildLegacyMap(redirects: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const [from, to] of Object.entries(redirects)) {
    const key = normalizeLegacyPath(from)
    map.set(key, to)
    map.set(key.replace(/\/$/, ''), to)
  }
  return map
}

/**
 * Cible de redirection d'un chemin brut (encodé), ou null.
 * N'agit que si la forme normalisée diffère du chemin reçu : un chemin déjà propre est laissé
 * aux pages du site (pas de redirection d'une page qui existe, pas de boucle).
 */
export function legacyRedirectTarget(rawPath: string, map: Map<string, string>): string | null {
  let decoded: string
  try { decoded = decodeURIComponent(rawPath.split('?')[0] || '') } catch { return null }
  const norm = normalizeLegacyPath(decoded)
  if (norm === decoded) return null
  const target = map.get(norm) ?? map.get(norm.replace(/\/$/, '')) ?? null
  if (!target || target.replace(/\/$/, '') === decoded.replace(/\/$/, '')) return null
  return target
}
