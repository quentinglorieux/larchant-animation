import { describe, it, expect } from 'vitest'
import { nextEditionDraft, isPastEdition, findDuplicateYear, deleteBlockReason } from './editions'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()
const last = { id: 7, evenement: 3, annee: 2026, date_start: '2026-03-08', date_end: null, status: 'published',
  edition_label: 'Édition 2026', lieu: 'Gymnase', content: '## Programme', affiche: 'uuid-a',
  inscription_url: 'https://x', inscription_pdf: 'uuid-b', resultats: 'Bilan', annule: true }

describe('nextEditionDraft', () => {
  it('crée un brouillon de l’année suivante qui reprend lieu et programme', () => {
    expect(nextEditionDraft(last, 3, NOW)).toMatchObject({ evenement: 3, annee: 2027, edition_label: 'Édition 2027', status: 'draft', lieu: 'Gymnase', content: '## Programme' })
  })
  it('vide ce qui est propre à une année', () => {
    const d = nextEditionDraft(last, 3, NOW)
    expect(d).toMatchObject({ date_start: null, date_end: null, affiche: null, inscription_url: null, inscription_pdf: null, resultats: null, annule: false })
    expect(d.id).toBeUndefined()
  })
  it('sans édition précédente, part de l’année courante', () => {
    expect(nextEditionDraft(null, 3, NOW).annee).toBe(2026)
  })
  it('après une longue interruption, propose l’année courante', () => {
    expect(nextEditionDraft({ ...last, annee: 2023 }, 3, NOW).annee).toBe(2026)
  })
})

describe('isPastEdition', () => {
  it('datée : passée après le dernier jour', () => {
    expect(isPastEdition({ annee: 2026, date_start: '2026-10-01', date_end: null }, NOW)).toBe(true)
    expect(isPastEdition({ annee: 2026, date_start: '2026-10-02', date_end: null }, NOW)).toBe(false)
  })
  it('sans date : passée si l’année est passée', () => {
    expect(isPastEdition({ annee: 2025, date_start: null, date_end: null }, NOW)).toBe(true)
    expect(isPastEdition({ annee: 2026, date_start: null, date_end: null }, NOW)).toBe(false)
  })
})

describe('findDuplicateYear', () => {
  const rows = [{ id: 1, evenement: 3, annee: 2025, date_start: null, date_end: null }]
  it('détecte une autre édition du même évènement la même année', () => {
    expect(findDuplicateYear(rows, { evenement: 3, annee: 2025, date_start: null, date_end: null })?.id).toBe(1)
  })
  it('ignore la fiche elle-même et les autres évènements', () => {
    expect(findDuplicateYear(rows, { id: 1, evenement: 3, annee: 2025, date_start: null, date_end: null })).toBeNull()
    expect(findDuplicateYear(rows, { evenement: 4, annee: 2025, date_start: null, date_end: null })).toBeNull()
  })
})

describe('deleteBlockReason', () => {
  it('bloque une édition passée', () => {
    expect(deleteBlockReason('editions', { annee: 2024, date_start: null, date_end: null }, { now: NOW })).toMatch(/archives/)
  })
  it('autorise un brouillon futur', () => {
    expect(deleteBlockReason('editions', { annee: 2027, date_start: null, date_end: null }, { now: NOW })).toBeNull()
  })
  it('bloque un évènement qui a des éditions', () => {
    expect(deleteBlockReason('evenements', {}, { editionsCount: 2 })).toMatch(/2 édition/)
  })
  it('autorise le reste', () => {
    expect(deleteBlockReason('articles', {})).toBeNull()
  })
})
