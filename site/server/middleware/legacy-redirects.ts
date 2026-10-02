import redirects from '../../redirects.json'

// Construite une seule fois, au chargement du serveur.
const legacyMap = buildLegacyMap(redirects as Record<string, string>)

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  // Une route rule de redirection a déjà répondu (ou va répondre) pour ce chemin.
  if (getRouteRules(event).redirect) return
  const target = legacyRedirectTarget(event.path, legacyMap)
  if (target) return sendRedirect(event, target, 301)
})
