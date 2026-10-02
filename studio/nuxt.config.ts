const DIRECTUS_URL = import.meta.env.NUXT_PUBLIC_DIRECTUS_URL || 'http://localhost:18056'

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  ssr: false,

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      directusUrl: DIRECTUS_URL
    }
  },

  // Proxy Directus via le serveur Nitro → requêtes same-origin (pas de CORS).
  routeRules: {
    '/api/directus/**': {
      proxy: `${DIRECTUS_URL}/**`
    }
  },

  devServer: { port: 13001 },

  compatibilityDate: '2025-01-15'
})
