const DIRECTUS_URL = import.meta.env.NUXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:18056'

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  vite: {
    optimizeDeps: {
      include: ['markdown-it', '@directus/sdk']
    }
  },

  devtools: { enabled: true },

  devServer: { port: Number(import.meta.env.NUXT_PORT ?? 13010) },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      titleTemplate: '%s · Larchant Animation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      directusUrl: DIRECTUS_URL,
      siteUrl: import.meta.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:13010',
      gasFormUrl: 'https://script.google.com/macros/s/AKfycbxTJwyga8hOEfVUfCIaMFl0QfnqmLoxAsra4XXpp9SebNJyQpVnkHS7lciGBhaDvxDKfg/exec'
    }
  },

  routeRules: {
    // Le markdown stocke les images en /assets/<id> : on les sert depuis Directus.
    '/assets/**': { proxy: `${DIRECTUS_URL}/assets/**` },
    '/**': { swr: 60 }
  },

  compatibilityDate: '2025-01-15'
})
