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
