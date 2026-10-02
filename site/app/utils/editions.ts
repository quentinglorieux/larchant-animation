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

const FR_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const FR_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

export function formatDate(d?: string | null): string {
  if (!d) return ''
  return FR_DATE.format(new Date(d))
}

export function formatMonth(d?: string | null): string {
  if (!d) return ''
  return FR_MONTH.format(new Date(d))
}
