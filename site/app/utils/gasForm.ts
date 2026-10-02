/** Envoi vers le Google Apps Script de l'association (même protocole que l'ancien site Hugo). */
export async function submitGasForm(
  action: string,
  fields: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<'ok' | 'invalid' | 'error'> {
  const body = new URLSearchParams({ ...fields, 'bot-field': '' })
  body.append('t', ['lar', 'chant', '-', '2026'].join(''))
  try {
    const r = await fetcher(action, { method: 'POST', body })
    return (await r.text()).trim() === 'ok' ? 'ok' : 'invalid'
  } catch {
    return 'error'
  }
}
