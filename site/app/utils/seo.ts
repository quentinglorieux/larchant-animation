// Description meta : texte brut (markdown et HTML retirés), 160 caractères maximum.
export function seoDescription(text: string | null | undefined, max = 160): string | undefined {
  const plain = (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return undefined
  return plain.length <= max ? plain : `${plain.slice(0, max - 1).trimEnd()}…`
}
