import type { Edition } from '~/types'

/**
 * Sélectionne l'édition « en cours / à venir » d'un évènement :
 *  1. l'édition à venir la plus proche (date_start dans le futur), sinon
 *  2. l'édition sans date marquée courante (sort le plus bas, ex. -9999), sinon
 *  3. l'édition la plus récente.
 */
export function currentEdition(editions: Edition[] = []): Edition | null {
  if (!editions.length) return null
  const now = Date.now()
  const withDate = editions.filter(e => e.date_start)
  const upcoming = withDate
    .filter(e => new Date(e.date_start as string).getTime() >= now)
    .sort((a, b) => new Date(a.date_start as string).getTime() - new Date(b.date_start as string).getTime())
  if (upcoming.length) return upcoming[0]!

  const evergreen = [...editions].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0]
  if (evergreen && (evergreen.sort ?? 0) <= -9999) return evergreen

  return withDate.sort((a, b) =>
    new Date(b.date_start as string).getTime() - new Date(a.date_start as string).getTime())[0]
    ?? editions[0]!
}

/** Les éditions passées (archive), triées de la plus récente à la plus ancienne. */
export function pastEditions(editions: Edition[] = [], current: Edition | null): Edition[] {
  return editions
    .filter(e => e.id !== current?.id)
    .sort((a, b) => (b.annee ?? 0) - (a.annee ?? 0))
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
