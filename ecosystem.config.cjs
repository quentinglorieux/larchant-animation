// PM2: site public + studio admin (build SSR Nuxt).
// Adapter le chemin racine et l'URL Directus de prod ci-dessous.
const ROOT = '/root/larchant-animation'
const DIRECTUS_PROD_URL = 'https://api.larchantanimation.fr'

module.exports = {
  apps: [
    {
      name: 'larchant-site',
      script: `${ROOT}/site/.output/server/index.mjs`,
      env: {
        NODE_ENV: 'production',
        PORT: 13000,
        NUXT_PUBLIC_DIRECTUS_URL: DIRECTUS_PROD_URL
      }
    },
    {
      name: 'larchant-studio',
      script: `${ROOT}/studio/.output/server/index.mjs`,
      env: {
        NODE_ENV: 'production',
        PORT: 13001,
        NUXT_PUBLIC_DIRECTUS_URL: DIRECTUS_PROD_URL
      }
    }
  ]
}
