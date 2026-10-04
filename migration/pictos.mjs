// Renseigne le champ `picto` des ateliers, activités et évènements avec les
// pictogrammes de l'ancien site (static/images/logos/*.svg, déjà importés dans
// Directus), par correspondance de slug. Ne touche pas un picto déjà choisi.
// Lancer après `npm run schema` : node migration/pictos.mjs
import { api } from './lib/directus.mjs'

const LOGOS = {
  ateliers: {
    'yoga': 'yoga.svg',
    'cirque': 'hugeicons-workout-gymnastics.svg',
    'gym': 'gym.svg',
    'lia': 'arcticons-lets-go-fitness.svg',
    'djembe': 'djembe.svg',
    'cirque-enfant': 'circus-stunt-acrobat-svgrepo-com.svg',
    'sophrologie': 'sophrologie.svg',
    'memoire': 'brain.svg',
    'dessin': 'streamline-freehand-design-process-drawing-board.svg'
  },
  activites: {
    'course': 'running.svg',
    'marche': 'marche.svg',
    'couture': 'couture.svg',
    'jeux': 'jeux.svg'
  },
  evenements: {
    'hivernale': 'vtt.svg',
    'lyricantrail': 'running.svg',
    'baleine': 'baleine.svg',
    'triathlon': 'triathlon.svg',
    'conferences': 'conference.svg',
    'foire-aux-plantes': 'plante.svg',
    'vide-grenier': 'market.svg',
    'telethon': 'tele.svg'
  }
}

const files = await api.get('/files?limit=-1&fields=id,filename_download&filter[type][_eq]=image/svg%2Bxml')
const byName = new Map(files.map((f) => [f.filename_download, f.id]))

for (const [collection, map] of Object.entries(LOGOS)) {
  console.log(`[${collection}]`)
  for (const it of await api.get(`/items/${collection}?limit=-1&fields=id,slug,picto`)) {
    const file = byName.get(map[it.slug])
    if (it.picto) console.log(`  = ${it.slug} (déjà renseigné)`)
    else if (!file) console.log(`  - ${it.slug} (aucun picto)`)
    else {
      await api.patch(`/items/${collection}/${it.id}`, { picto: file })
      console.log(`  + ${it.slug} → ${map[it.slug]}`)
    }
  }
}
