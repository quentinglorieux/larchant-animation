import { describe, it, expect } from 'vitest'
import { friendlyDirectusError } from './directusErrors'

const err = (code: string) => ({ errors: [{ message: 'x', extensions: { code } }], response: {} })

describe('friendlyDirectusError', () => {
  it('slug déjà pris', () => expect(friendlyDirectusError(err('RECORD_NOT_UNIQUE'))).toBe('Cette adresse (slug) est déjà utilisée par un autre contenu.'))
  it('champ obligatoire', () => {
    expect(friendlyDirectusError(err('FAILED_VALIDATION'))).toBe('Un champ obligatoire est vide.')
    expect(friendlyDirectusError(err('NOT_NULL_VIOLATION'))).toBe('Un champ obligatoire est vide.')
  })
  it('droits insuffisants', () => expect(friendlyDirectusError(err('FORBIDDEN'))).toBe('Vous n’avez pas le droit de faire cette modification.'))
  it('erreur inconnue ou réseau : null', () => {
    expect(friendlyDirectusError(err('INTERNAL_SERVER_ERROR'))).toBeNull()
    expect(friendlyDirectusError(new TypeError('Failed to fetch'))).toBeNull()
    expect(friendlyDirectusError(undefined)).toBeNull()
  })
})
