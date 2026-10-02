import { describe, it, expect, vi } from 'vitest'
import { applyFormat, insertUploadedImage } from './markdownFormat'

describe('applyFormat', () => {
  it('met la sélection en gras et la garde sélectionnée', () => {
    expect(applyFormat('un mot ici', 3, 6, 'bold')).toEqual({ doc: 'un **mot** ici', from: 5, to: 8 })
  })
  it('sans sélection, insère les marqueurs avec le curseur au milieu', () => {
    expect(applyFormat('ab', 1, 1, 'italic')).toEqual({ doc: 'a__b', from: 2, to: 2 })
  })
  it('titre : préfixe le début de la ligne courante', () => {
    expect(applyFormat('l1\nTitre', 5, 5, 'h2')).toEqual({ doc: 'l1\n## Titre', from: 8, to: 8 })
  })
  it('liste à puces sur plusieurs lignes', () => {
    expect(applyFormat('a\nb', 0, 3, 'ul').doc).toBe('- a\n- b')
  })
  it('liste numérotée', () => {
    expect(applyFormat('a\nb', 0, 3, 'ol').doc).toBe('1. a\n2. b')
  })
  it('lien : la sélection devient le texte, l’URL est sélectionnée', () => {
    expect(applyFormat('voir site', 5, 9, 'link')).toEqual({ doc: 'voir [site](https://)', from: 12, to: 20 })
  })
})

describe('insertUploadedImage', () => {
  it('insère la balise image après upload', async () => {
    const insert = vi.fn()
    await insertUploadedImage(async () => 'uuid-1', insert, vi.fn())
    expect(insert).toHaveBeenCalledWith('![](/assets/uuid-1)')
  })
  it('signale l’échec sans rien insérer', async () => {
    const insert = vi.fn()
    const onError = vi.fn()
    await insertUploadedImage(async () => { throw new Error('401') }, insert, onError)
    expect(insert).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('L’image n’a pas pu être envoyée. Votre texte est conservé.')
  })
  it('signale un upload sans identifiant', async () => {
    const onError = vi.fn()
    await insertUploadedImage(async () => null, vi.fn(), onError)
    expect(onError).toHaveBeenCalledOnce()
  })
})
