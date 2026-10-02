// PM2: site public + studio admin (build SSR Nuxt).
// Adapter le chemin racine et l'URL Directus de prod ci-dessous.
// HOST 127.0.0.1 : Nitro n'écoute qu'en local, nginx sert de frontal public.
const ROOT = '/root/larchant-animation'
// Domaines TEMPORAIRES (la.quentinglorieux.fr) jusqu'à la bascule sur larchantanimation.fr :
// changer ces deux constantes puis rebuild (voir README-refonte.md, section Production).
const DIRECTUS_PROD_URL = 'https://api.la.quentinglorieux.fr'
const SITE_URL = 'https://la.quentinglorieux.fr'

module.exports = {
  apps: [
    {
      name: 'larchant-site',
      script: `${ROOT}/site/.output/server/index.mjs`,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 13010,
        NUXT_PUBLIC_DIRECTUS_URL: DIRECTUS_PROD_URL,
        NUXT_PUBLIC_SITE_URL: SITE_URL
      }
    },
    {
      name: 'larchant-studio',
      script: `${ROOT}/studio/.output/server/index.mjs`,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 13011,
        NUXT_PUBLIC_DIRECTUS_URL: DIRECTUS_PROD_URL,
        NUXT_PUBLIC_SITE_URL: SITE_URL
      }
    }
  ]
}
