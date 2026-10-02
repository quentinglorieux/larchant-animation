import { describe, it, expect, vi } from 'vitest'
import { submitGasForm } from './gasForm'

const res = (text: string) => Promise.resolve({ text: () => Promise.resolve(text) } as Response)

describe('submitGasForm', () => {
  it('envoie les champs, le piège vide et le jeton, et renvoie ok', async () => {
    const f = vi.fn((_url: string, _init: RequestInit) => res(' ok\n'))
    expect(await submitGasForm('https://gas', { email: 'a@b.fr' }, f as unknown as typeof fetch)).toBe('ok')
    const body = f.mock.calls[0]![1].body as URLSearchParams
    expect(body.get('email')).toBe('a@b.fr')
    expect(body.get('t')).toBe('larchant-2026')
    expect(body.get('bot-field')).toBe('')
  })
  it('renvoie invalid si le script ne répond pas ok', async () => {
    expect(await submitGasForm('https://gas', {}, (() => res('bad email')) as unknown as typeof fetch)).toBe('invalid')
  })
  it('renvoie error si le réseau échoue', async () => {
    expect(await submitGasForm('https://gas', {}, (() => Promise.reject(new Error('x'))) as unknown as typeof fetch)).toBe('error')
  })
})
