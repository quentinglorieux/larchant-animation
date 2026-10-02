import { describe, it, expect } from 'vitest'
import type { Edition } from '~/types'
import { currentEdition, pastEditions, isFinished, adjacentEditions } from './editions'

const ed = (id: number, annee: number, date_start: string | null = null, extra: Partial<Edition> = {}): Edition =>
  ({ id, status: 'published', annee, edition_label: `Édition ${annee}`, date_start, date_end: null, ...extra })
const NOW = new Date('2026-10-02T12:00:00Z').getTime()

describe('currentEdition', () => {
  it('retourne null sans édition', () => expect(currentEdition([], NOW)).toBeNull())

  it('choisit l’édition à venir la plus proche', () => {
    const list = [ed(1, 2025, '2025-03-09'), ed(2, 2027, '2027-03-14'), ed(3, 2026, '2026-10-11')]
    expect(currentEdition(list, NOW)?.id).toBe(3)
  })

  it('garde une édition dont la date de fin n’est pas passée', () => {
    expect(currentEdition([ed(1, 2026, '2026-09-30', { date_end: '2026-10-03' })], NOW)?.id).toBe(1)
  })

  it('garde l’édition du jour jusqu’à minuit', () => {
    expect(isFinished(ed(1, 2026, '2026-10-02'), NOW)).toBe(false)
  })

  it('sinon retient la plus récente, terminée', () => {
    const list = [ed(1, 2024, null), ed(2, 2026, '2026-03-08'), ed(3, 2025, '2025-03-09')]
    expect(currentEdition(list, NOW)?.id).toBe(2)
  })

  it('sans date : une édition annoncée pour une année future passe devant une édition passée', () => {
    expect(currentEdition([ed(1, 2026, '2026-03-08'), ed(2, 2027, null)], NOW)?.id).toBe(2)
  })

  it('une édition annulée peut être l’édition en cours', () => {
    expect(currentEdition([ed(1, 2025, '2025-03-09'), ed(2, 2026, '2026-11-08', { annule: true })], NOW)?.id).toBe(2)
  })
})

describe('pastEditions', () => {
  it('exclut l’édition en cours et trie par année décroissante', () => {
    const list = [ed(1, 2024), ed(2, 2026, '2026-10-11'), ed(3, 2025)]
    expect(pastEditions(list, currentEdition(list, NOW)).map(e => e.id)).toEqual([3, 1])
  })
})

describe('isFinished', () => {
  it('sans date : terminée si l’année est passée', () => {
    expect(isFinished(ed(1, 2025), NOW)).toBe(true)
    expect(isFinished(ed(1, 2026), NOW)).toBe(false)
  })
})

describe('adjacentEditions', () => {
  it('donne les éditions voisines par année', () => {
    const list = [ed(1, 2024), ed(2, 2025), ed(3, 2026)]
    const { prev, next } = adjacentEditions(list, list[1]!)
    expect([prev?.id, next?.id]).toEqual([1, 3])
  })
  it('renvoie null aux extrémités', () => {
    const list = [ed(1, 2024), ed(2, 2025)]
    expect(adjacentEditions(list, list[0]!).prev).toBeNull()
    expect(adjacentEditions(list, list[1]!).next).toBeNull()
  })
})
