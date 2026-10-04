export interface Categorie {
  id: number
  name: string
  slug: string
  type?: string
  couleur?: string | null
  couleur_accent?: string | null
  icon?: string | null
}

export interface Edition {
  id: number
  status: string
  evenement?: number | Evenement
  annee: number | null
  edition_label: string
  date_start: string | null
  date_end: string | null
  lieu?: string | null
  affiche?: string | null
  content?: string | null
  resultats?: string | null
  inscription_url?: string | null
  inscription_pdf?: string | null
  annule?: boolean
  articles_lies?: { articles_id: Article }[]
}

export interface Evenement {
  id: number
  status: string
  title: string
  slug: string
  description?: string | null
  category?: number | Categorie | null
  lieu_defaut?: string | null
  recurrence?: string | null
  reglement?: string | null
  image?: string | null
  picto?: string | null
  couleur?: string | null
  couleur_accent?: string | null
  featured?: boolean
  editions?: Edition[]
}

export interface Article {
  id: number
  status: string
  title: string
  slug: string
  date: string | null
  description?: string | null
  preview?: string | null
  content?: string | null
  category?: number | Categorie | null
  featured?: boolean
  evenements_lies?: { evenements_id: Evenement }[]
}

export interface Atelier {
  id: number
  status: string
  title: string
  slug: string
  description?: string | null
  animateur?: string | null
  horaires?: string | null
  lieu?: string | null
  salle?: string | null
  tarif?: string | null
  contact?: string | null
  image?: string | null
  picto?: string | null
  category?: number | Categorie | null
  actif?: boolean
}

export interface Newsletter {
  id: number
  title: string
  slug: string
  date: string | null
  numero?: number | null
  description?: string | null
  fichier?: string | null
}

export interface PageDoc {
  id: number
  title: string
  slug: string
  content?: string | null
  image?: string | null
}

export interface SiteParams {
  site_title?: string
  hero_title?: string
  hero_subtitle?: string
  logo?: string | null
  logo_dark?: string | null
  hero_image?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  youtube_url?: string | null
  devise?: string | null
  bandeau_texte?: string | null
  bandeau_lien?: string | null
  asso_titre?: string | null
  asso_texte?: string | null
  asso_image?: string | null
  ateliers_texte?: string | null
  newsletter_texte?: string | null
}

export interface Slide { id: number, title?: string | null, lien?: string | null, image?: string | null, sort?: number }

export interface InfosGenerales {
  adresse?: string | null
  email?: string | null
  telephone?: string | null
  horaires?: string | null
  president?: string | null
  adhesion?: string | null
  helloasso_url?: string | null
  mentions_legales?: string | null
}
