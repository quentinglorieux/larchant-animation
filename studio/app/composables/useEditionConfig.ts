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
    if (p.annee == null || p.annee === '' || Number.isNaN(Number(p.annee))) return 'L’année est obligatoire.'
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
