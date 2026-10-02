// Génère editions-review.md : tableau des éditions importées, à faire valider avant l'import final.
import { writeFileSync } from 'node:fs'
import { api } from './lib/directus.mjs'

const eds = await api.get('/items/editions?limit=-1&sort=evenement.title,annee&fields=annee,date_start,date_end,annule,inscription_url,legacy_path,evenement.title,articles_lies.articles_id.title')
const lines = [
  '# Éditions importées (à valider)', '',
  '| Évènement | Année | Date | Annulée | Inscription | Articles rattachés | Source |',
  '|---|---|---|---|---|---|---|',
]
for (const e of eds) {
  const arts = (e.articles_lies || []).map((a) => a.articles_id?.title).filter(Boolean).join(' ; ')
  const date = [e.date_start, e.date_end].filter(Boolean).join(' au ') || 'sans date'
  lines.push(`| ${e.evenement?.title} | ${e.annee} | ${date} | ${e.annule ? 'oui' : ''} | ${e.inscription_url ? 'lien' : ''} | ${arts} | ${e.legacy_path} |`)
}
writeFileSync(new URL('./editions-review.md', import.meta.url), lines.join('\n') + '\n')
console.log(`${eds.length} éditions → editions-review.md`)
