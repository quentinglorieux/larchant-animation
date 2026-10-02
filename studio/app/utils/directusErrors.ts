// Traduit une erreur renvoyée par @directus/sdk 19 ({ errors: [{ extensions: { code } }], response })
// en message compréhensible par un bénévole. null : erreur inconnue, l'appelant garde son message générique.
const MESSAGES: Record<string, string> = {
  RECORD_NOT_UNIQUE: 'Cette adresse (slug) est déjà utilisée par un autre contenu.',
  FAILED_VALIDATION: 'Un champ obligatoire est vide.',
  NOT_NULL_VIOLATION: 'Un champ obligatoire est vide.',
  CONTAINS_NULL_VALUES: 'Un champ obligatoire est vide.',
  FORBIDDEN: 'Vous n’avez pas le droit de faire cette modification.'
}

export function directusErrorCode(e: unknown): string | null {
  const errors = (e as { errors?: unknown })?.errors
  if (!Array.isArray(errors)) return null
  const code = (errors[0] as { extensions?: { code?: unknown } } | undefined)?.extensions?.code
  return typeof code === 'string' ? code : null
}

export function friendlyDirectusError(e: unknown): string | null {
  const code = directusErrorCode(e)
  return code ? MESSAGES[code] ?? null : null
}
