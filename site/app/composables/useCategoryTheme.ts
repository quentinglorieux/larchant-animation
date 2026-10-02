/**
 * Thématisation pilotée par les données.
 *
 * Chaque catégorie stocke deux couleurs dans Directus (`couleur` + `couleur_accent`).
 * Tous les dégradés / bordures / fonds utilisés sur le site en sont dérivés ici via
 * `color-mix()`, de sorte qu'une nouvelle catégorie créée dans le Studio ne demande
 * aucune modification de code.
 */

export interface CategoryColors {
  couleur?: string | null
  couleur_accent?: string | null
  name?: string | null
  icon?: string | null
}

const DEFAULT_COLOR = '#4F7A4A' // vert forêt neutre
const DEFAULT_ACCENT = '#DDEAD7'

function mix(c: string, pct: number, other: string) {
  return `color-mix(in oklab, ${c} ${pct}%, ${other})`
}

export interface CategoryTheme {
  color: string
  accent: string
  gradient: string
  border: string
  glow: string
  chipBg: string
  chipText: string
  icon: string | null
}

export function categoryTheme(cat?: CategoryColors | null): CategoryTheme {
  const c = cat?.couleur || DEFAULT_COLOR
  const a = cat?.couleur_accent || DEFAULT_ACCENT
  return {
    color: c,
    accent: a,
    gradient: `linear-gradient(160deg, ${mix(c, 88, '#0e1a12')} 0%, ${mix(c, 46, '#0e1a12')} 100%)`,
    border: mix(c, 38, 'transparent'),
    glow: mix(c, 24, 'transparent'),
    chipBg: mix(c, 14, 'transparent'),
    chipText: mix(c, 64, 'black'),
    icon: cat?.icon || null
  }
}

export function categoryColorAlpha(cat: CategoryColors | null | undefined, pct: number) {
  return mix(cat?.couleur || DEFAULT_COLOR, pct, 'transparent')
}
