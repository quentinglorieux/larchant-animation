/*
 * Pictogrammes : champ `picto` (SVG) des ateliers, activités et évènements,
 * modifiable dans le Studio. L'ordre ci-dessous reprend l'ordre d'affichage
 * de l'ancien site ; les éléments absents de la liste passent à la fin.
 */
export const LOGO_ORDER: Record<'ateliers' | 'activites' | 'evenements', string[]> = {
  ateliers: ['yoga', 'cirque', 'gym', 'lia', 'djembe', 'cirque-enfant', 'sophrologie', 'memoire', 'dessin'],
  activites: ['course', 'marche', 'couture', 'jeux'],
  evenements: ['hivernale', 'lyricantrail', 'baleine', 'triathlon', 'conferences', 'foire-aux-plantes', 'vide-grenier', 'telethon']
}

/** Trie des éléments selon l'ordre de l'ancien site, les inconnus à la fin. */
export function sortByLogoOrder<T extends { slug: string }>(kind: keyof typeof LOGO_ORDER, items: T[] | null | undefined): T[] {
  const order = LOGO_ORDER[kind]
  const rank = (s: string) => { const i = order.indexOf(s); return i === -1 ? order.length : i }
  return [...(items || [])].sort((a, b) => rank(a.slug) - rank(b.slug))
}

/** URL du pictogramme d'un élément, ou null s'il n'en a pas. */
export function usePicto() {
  const { getUrl } = useDirectusFile()
  return (item: { picto?: string | null }) => getUrl(item.picto)
}
