import { readFiles } from '@directus/sdk'

/*
 * Pictogrammes de l'ancien site (static/images/logos/*.svg), importés dans
 * Directus par la migration. Aucun champ Directus ne relie un atelier, une
 * activité ou un évènement à son pictogramme : on fait la correspondance par
 * slug, puis on retrouve le fichier Directus par son nom d'origine.
 * L'ordre des clés reprend l'ordre d'affichage de l'ancien site.
 */
export const LOGOS: Record<'ateliers' | 'activites' | 'evenements', Record<string, string>> = {
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

const ALL_FILES = [...new Set(Object.values(LOGOS).flatMap(m => Object.values(m)))]

/** Trie des éléments selon l'ordre de l'ancien site, les inconnus à la fin. */
export function sortByLogoOrder<T extends { slug: string }>(kind: keyof typeof LOGOS, items: T[] | null | undefined): T[] {
  const order = Object.keys(LOGOS[kind])
  const rank = (s: string) => { const i = order.indexOf(s); return i === -1 ? order.length : i }
  return [...(items || [])].sort((a, b) => rank(a.slug) - rank(b.slug))
}

export async function useLogos() {
  const directus = useDirectus()
  const { getUrl } = useDirectusFile()
  const { data: files } = await useAsyncData('logos-files', () =>
    directus.request(readFiles({
      filter: { filename_download: { _in: ALL_FILES } },
      fields: ['id', 'filename_download'],
      limit: -1
    })) as Promise<{ id: string, filename_download: string }[]>
  )

  /** URL du pictogramme d'un élément, ou null si aucun ne correspond. */
  function logoUrl(kind: keyof typeof LOGOS, slug: string): string | null {
    const name = LOGOS[kind][slug]
    const file = name ? files.value?.find(f => f.filename_download === name) : undefined
    return file ? getUrl(file.id) : null
  }

  return { logoUrl }
}
