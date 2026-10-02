import { describe, it, expect } from 'vitest'
import { uniqueSlug, slugYear } from './slug'

const taken = (list: string[]) => async (s: string) => list.includes(s)

describe('uniqueSlug', () => {
  it('garde l’adresse si elle est libre', async () => {
    expect(await uniqueSlug('petanque', 2026, taken([]))).toBe('petanque')
  })
  it('ajoute l’année si l’adresse est prise', async () => {
    expect(await uniqueSlug('petanque', 2026, taken(['petanque']))).toBe('petanque-2026')
  })
  it('numérote ensuite -2, -3…', async () => {
    expect(await uniqueSlug('petanque', 2026, taken(['petanque', 'petanque-2026', 'petanque-2026-2']))).toBe('petanque-2026-3')
  })
  it('n’ajoute pas deux fois l’année', async () => {
    expect(await uniqueSlug('fete-2026', 2026, taken(['fete-2026']))).toBe('fete-2026-2')
  })
})

describe('slugYear', () => {
  const now = new Date('2026-10-02T12:00:00Z')
  it('prend l’année de la date', () => expect(slugYear({ date: '2024-06-08' }, now)).toBe(2024))
  it('sinon l’année saisie', () => expect(slugYear({ annee: 2027 }, now)).toBe(2027))
  it('sinon l’année en cours', () => expect(slugYear({}, now)).toBe(2026))
})
