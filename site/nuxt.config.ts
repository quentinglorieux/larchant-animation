export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  vite: {
    optimizeDeps: {
      include: ['markdown-it', '@directus/sdk']
    }
  },

  devtools: { enabled: true },

  devServer: { port: Number(import.meta.env.NUXT_PORT ?? 13000) },

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
      directusUrl: import.meta.env.NUXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:18056'
    }
  },

  compatibilityDate: '2025-01-15'
})
