export type FormatKind = 'bold' | 'italic' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'link'

const WRAP: Partial<Record<FormatKind, string>> = { bold: '**', italic: '_' }
const LINE: Partial<Record<FormatKind, (i: number) => string>> = {
  h2: () => '## ', h3: () => '### ', ul: () => '- ', ol: i => `${i + 1}. `, quote: () => '> '
}

/** Applique un format markdown à la sélection [from, to] ; renvoie le texte et la nouvelle sélection. */
export function applyFormat(doc: string, from: number, to: number, kind: FormatKind): { doc: string, from: number, to: number } {
  const sel = doc.slice(from, to)
  const wrap = WRAP[kind]
  if (wrap) {
    return { doc: doc.slice(0, from) + wrap + sel + wrap + doc.slice(to), from: from + wrap.length, to: to + wrap.length }
  }
  if (kind === 'link') {
    const urlStart = from + sel.length + 3
    return { doc: `${doc.slice(0, from)}[${sel}](https://)${doc.slice(to)}`, from: urlStart, to: urlStart + 8 }
  }
  const prefix = LINE[kind]!
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1
  const lines = doc.slice(lineStart, to).split('\n')
  const block = lines.map((l, i) => prefix(i) + l).join('\n')
  const added = block.length - (to - lineStart)
  return { doc: doc.slice(0, lineStart) + block + doc.slice(to), from: from + prefix(0).length, to: to + added }
}

export async function insertUploadedImage(
  upload: () => Promise<string | null>,
  insert: (md: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    const id = await upload()
    if (!id) throw new Error('upload sans identifiant')
    insert(`![](/assets/${id})`)
  } catch {
    onError('L’image n’a pas pu être envoyée. Votre texte est conservé.')
  }
}
