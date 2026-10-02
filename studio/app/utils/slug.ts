// Rend une adresse unique : slug, puis slug-<année>, puis slug-<année>-2, -3…
// exists interroge la collection (Directus) pour savoir si l'adresse est déjà prise.
export async function uniqueSlug(
  base: string,
  year: number | string,
  exists: (slug: string) => Promise<boolean>,
  maxTries = 50
): Promise<string> {
  if (!base || !(await exists(base))) return base
  const withYear = String(base).endsWith(`-${year}`) ? base : `${base}-${year}`
  if (!(await exists(withYear))) return withYear
  for (let n = 2; n <= maxTries; n++) {
    const candidate = `${withYear}-${n}`
    if (!(await exists(candidate))) return candidate
  }
  return `${withYear}-${Date.now()}`
}

/** Année de référence d'un contenu : sa date, sinon son année, sinon l'année en cours. */
export function slugYear(form: Record<string, unknown>, now = new Date()): number {
  const d = typeof form.date === 'string' ? form.date : typeof form.date_start === 'string' ? form.date_start : ''
  const fromDate = Number(d.slice(0, 4))
  if (fromDate > 1900) return fromDate
  const annee = Number(form.annee)
  if (annee > 1900) return annee
  return now.getFullYear()
}
