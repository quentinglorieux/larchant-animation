<script setup lang="ts">
import type { Article, Atelier, Categorie, SiteParams } from '~/types'

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters')
const { getUrl } = useDirectusFile()
const pictoUrl = usePicto()

// Dernières actualités (un article « à la une » y figure aussi).
const { data: articles } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' } },
  sort: ['-date'],
  limit: 3,
  fields: ['*', { category: ['*'] }]
})

// « À la une » : les 3 articles mis en avant les plus récents.
const { data: unes } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' }, featured: { _eq: true } },
  sort: ['-date'],
  limit: 3,
  fields: ['*', { category: ['*'] }]
})

const { data: ateliersRaw } = await useDirectusCollection<Atelier>('ateliers', {
  filter: { status: { _eq: 'published' }, actif: { _eq: true } },
  sort: ['title'],
  limit: -1,
  fields: ['id', 'slug', 'title', 'image', 'picto']
})

const { data: activitesRaw } = await useDirectusCollection<Atelier>('activites', {
  filter: { status: { _eq: 'published' } },
  sort: ['title'],
  limit: -1,
  fields: ['id', 'slug', 'title', 'image', 'picto']
})

const ateliers = computed(() => sortByLogoOrder('ateliers', ateliersRaw.value))
const activites = computed(() => sortByLogoOrder('activites', activitesRaw.value))

/** Pictogramme de l'ancien site, sinon l'image de l'élément dans Directus. */
const tileImage = (it: Atelier) =>
  pictoUrl(it) || getUrl(it.image, { width: '96', height: '96', fit: 'contain' })

const logo = computed(() => getUrl(site.value?.logo, { width: '300', height: '300', fit: 'contain' }))
const hasBandeau = computed(() => !!(site.value?.bandeau_texte && site.value?.bandeau_lien))

const LONG_DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
const longDate = (d?: string | null) => (d ? LONG_DATE.format(new Date(d)) : '')
const catName = (c: unknown) => (c && typeof c === 'object' ? (c as Categorie).name : null)

function scrollToAsso(e: Event) {
  const el = document.getElementById('association')
  if (!el) return
  e.preventDefault()
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' })
}
</script>

<template>
  <div>
    <!-- Hero (ancien home/hero.html) -->
    <section class="relative bg-slate-200 dark:bg-gray-900 min-h-[70vh] pb-10">
      <div class="max-w-screen-xl px-4 py-8 mx-auto">
        <div class="grid items-center gap-8 mb-8 sm:mb-0 lg:gap-12 lg:grid-cols-12">
          <div class="flex flex-col col-span-6 px-4 text-center sm:mb-6 lg:mb-0 lg:text-left">
            <h1 class="mb-2 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl xl:text-6xl dark:text-white">
              {{ site?.hero_title || 'Larchant Animation' }}
            </h1>
            <h2 v-if="site?.devise" class="pb-2 text-2xl font-light text-gray-800 dark:text-gray-300 md:text-4xl">
              {{ site.devise }}
            </h2>
            <p v-if="site?.hero_subtitle" class="max-w-xl mx-auto mb-6 font-normal text-gray-900 lg:mx-0 xl:mb-2 md:text-lg xl:text-xl dark:text-gray-50">
              {{ site.hero_subtitle }}
            </p>

            <div v-if="logo" class="pt-10 mx-auto mb-6 sm:px-6 lg:mx-0 md:pt-0">
              <div class="la-spin">
                <img :src="logo" width="150" height="150" alt="Logo de Larchant Animation" class="size-[150px] object-contain">
              </div>
            </div>

            <div class="flex flex-col items-center gap-4 lg:items-start">
              <NuxtLink
                to="/adherez"
                class="inline-flex items-center px-6 py-3 text-base font-medium text-white rounded-md shadow-sm bg-indigo-500 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Adhérez à Larchant Animation
              </NuxtLink>
              <NuxtLink
                v-if="hasBandeau"
                :to="site!.bandeau_lien!"
                class="inline-flex items-center px-6 py-3 text-base font-medium text-white rounded-md shadow-sm bg-blue-500 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {{ site!.bandeau_texte }}
              </NuxtLink>
            </div>
          </div>

          <!-- À la une (ancien home/alaune.html) -->
          <div class="col-span-6">
            <div v-if="unes?.length" class="flex flex-col mt-8">
              <h2 class="text-3xl font-black tracking-tight text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)] sm:text-4xl">
                À la une
              </h2>
              <div class="grid gap-4 mt-4">
                <div
                  v-for="a in unes"
                  :key="`une-${a.id}`"
                  class="flex mb-4 overflow-hidden rounded-lg shadow-lg bg-gray-50 dark:bg-gray-800 hover:shadow-xl"
                >
                  <NuxtLink :to="`/blog/${a.slug}`" class="relative hidden shrink-0 sm:block w-32 md:w-48" tabindex="-1" aria-hidden="true">
                    <img
                      v-if="a.preview"
                      :src="getUrl(a.preview, { width: '400', height: '300', fit: 'cover' })!"
                      alt=""
                      class="absolute inset-0 size-full object-cover rounded-l-lg"
                      loading="lazy"
                    >
                    <span v-if="catName(a.category)" class="absolute bottom-2 left-0 w-3/5 truncate rounded-r-lg bg-black/60 px-2 py-1 text-xs text-white">
                      {{ catName(a.category) }}
                    </span>
                  </NuxtLink>
                  <div class="flex flex-col flex-1 p-4 text-left">
                    <NuxtLink :to="`/blog/${a.slug}`" class="block mt-1 text-xl font-black text-gray-900 dark:text-gray-200 hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] hover:underline">
                      {{ a.title }}
                    </NuxtLink>
                    <p v-if="a.description" class="mt-2 text-sm text-gray-900 dark:text-gray-300 line-clamp-3">
                      {{ a.description }}
                    </p>
                    <time v-if="a.date" :datetime="a.date" class="mt-auto pt-4 text-xs text-gray-500 dark:text-white">
                      {{ longDate(a.date) }}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden pt-10 md:flex">
        <div class="mx-auto la-chevron">
          <a href="#association" class="text-gray-500 dark:text-white" aria-label="Aller à la présentation de l’association" @click="scrollToAsso">
            <UIcon name="i-lucide-chevron-down" class="size-10 block" />
          </a>
        </div>
      </div>
    </section>

    <!-- Association (ancien home/association.html) -->
    <section v-if="site?.asso_texte" id="association" class="relative mt-4 mb-10">
      <div class="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-24 lg:px-8">
        <div class="relative sm:py-8 lg:py-0">
          <div aria-hidden="true" class="hidden sm:block lg:absolute lg:inset-y-0 lg:right-0 lg:w-screen">
            <div class="absolute inset-y-0 w-full bg-gray-50 dark:bg-gray-900/10 right-1/2 rounded-r-3xl lg:right-72" />
            <svg class="absolute -ml-3 top-8 left-1/2 lg:-right-8 lg:left-auto lg:top-12" width="404" height="392" fill="none" viewBox="0 0 404 392">
              <defs>
                <pattern id="la-dots-asso" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="4" height="4" class="text-gray-200 dark:text-gray-900/60" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="404" height="392" fill="url(#la-dots-asso)" />
            </svg>
          </div>
          <div v-if="site.asso_image" class="relative hidden w-full h-auto px-4 py-6 mx-auto sm:max-w-3xl sm:px-6 lg:px-0 lg:py-20 lg:block">
            <div class="overflow-hidden shadow-xl rounded-2xl">
              <img :src="getUrl(site.asso_image, { width: '1000' })!" alt="" class="w-4/5 h-auto" loading="lazy">
            </div>
          </div>
        </div>
        <div class="relative max-w-md px-4 mx-auto sm:max-w-3xl sm:px-6 lg:px-0">
          <div class="sm:pt-6 md:pt-12 lg:pt-20">
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              {{ site.asso_titre || 'Notre association' }}
            </h2>
            <MarkdownBody :text="site.asso_texte" class="mt-6 text-lg text-gray-900! dark:text-white!" />
          </div>
        </div>
      </div>
    </section>

    <!-- Blog (ancien home/blog.html) -->
    <section v-if="articles?.length" class="relative px-1 pt-8 pb-4 bg-transparent lg:px-8 lg:pt-12 lg:mb-4 md:mt-12">
      <div class="absolute inset-0" aria-hidden="true">
        <div class="bg-gray-200 dark:bg-gray-900/50 h-1/3 sm:h-2/3" />
      </div>
      <div class="relative px-2 mx-auto max-w-7xl">
        <div class="text-center">
          <h2 class="text-3xl font-black tracking-tight text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)] sm:text-4xl">
            Le Blog des Évènements
          </h2>
        </div>
        <div class="px-4 mx-auto text-gray-900 max-w-7xl dark:text-zinc-200 md:px-1.5">
          <div class="grid gap-4 mx-auto mt-12 mb-4 lg:max-w-none md:grid-cols-3">
            <article
              v-for="a in articles"
              :key="a.id"
              class="flex flex-col justify-between overflow-hidden rounded-lg shadow-lg bg-gray-50 dark:bg-gray-900"
            >
              <NuxtLink :to="`/blog/${a.slug}`" tabindex="-1" aria-hidden="true">
                <img v-if="a.preview" :src="getUrl(a.preview, { width: '500' })!" alt="" class="w-full rounded-t-lg" loading="lazy">
              </NuxtLink>
              <div class="p-6">
                <NuxtLink :to="`/blog/${a.slug}`" class="block mt-2 text-2xl font-black text-gray-900 dark:text-gray-200 hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-500)] hover:underline">
                  {{ a.title }}
                </NuxtLink>
                <p v-if="a.description" class="mt-3 text-base text-gray-900 dark:text-gray-300">
                  {{ a.description }}
                </p>
                <div v-if="catName(a.category)" class="flex items-center pt-6 font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-100)]">
                  <span class="pr-2 font-black">Tags :</span>
                  <span class="inline-flex items-center rounded-md bg-gray-300 px-2.5 py-0.5 text-sm font-medium text-gray-900">{{ catName(a.category) }}</span>
                </div>
                <time v-if="a.date" :datetime="a.date" class="flex pt-6 font-black uppercase text-gray-800 dark:text-white">
                  {{ longDate(a.date) }}
                </time>
              </div>
            </article>
          </div>
          <div class="pb-4 text-center">
            <NuxtLink to="/blog" class="text-base font-medium text-[var(--color-brand-400)] dark:text-indigo-400">
              Voir tous les articles&nbsp;→
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Ateliers (ancien home/ateliers.html) -->
    <section class="bg-slate-200 dark:bg-gray-900">
      <div class="max-w-md px-4 pt-2 mx-auto sm:max-w-3xl sm:px-6 md:pt-10 md:pb-6 lg:max-w-7xl lg:px-8">
        <div class="lg:grid lg:grid-cols-2 lg:items-center lg:gap-24">
          <div v-if="ateliers.length" class="grid grid-cols-2 gap-0.5 mt-12 md:grid-cols-3 lg:mt-0 lg:grid-cols-2">
            <NuxtLink
              v-for="at in ateliers"
              :key="at.id"
              :to="`/ateliers/${at.slug}`"
              class="flex flex-col justify-center col-span-1 px-8 pt-8 pb-4 bg-gray-50 hover:bg-slate-300 hover:text-indigo-600 dark:text-slate-200 dark:bg-gray-900/10 dark:hover:bg-slate-600 dark:hover:text-indigo-300"
            >
              <img v-if="tileImage(at)" :src="tileImage(at)!" alt="" class="w-full max-h-12 object-contain dark:invert">
              <span class="pt-2 text-center">{{ at.title }}</span>
            </NuxtLink>
          </div>
          <div class="pb-8 lg:pb-0">
            <h2 class="pt-1 mt-8 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl lg:mt-0">
              Nos ateliers
            </h2>
            <MarkdownBody v-if="site?.ateliers_texte" :text="site.ateliers_texte" class="max-w-3xl mt-6 text-lg leading-7 text-gray-900! dark:text-white!" />
            <div class="my-6">
              <NuxtLink to="/ateliers" class="text-base font-medium text-[var(--color-brand-400)] dark:text-indigo-400">
                Voir tous nos ateliers&nbsp;→
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Activités (ancien home/activites.html) -->
    <section class="max-w-md px-4 pt-6 mx-auto sm:max-w-3xl sm:px-6 md:pt-10 md:pb-16 lg:max-w-7xl lg:px-8">
      <div class="lg:grid lg:grid-cols-2 lg:items-center lg:gap-24">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
            Nos activités libres
          </h2>
          <p class="max-w-3xl mt-6 text-lg leading-7 text-gray-900 dark:text-white">
            Nous proposons des activités libres pour se retrouver entre passionné·es et pratiquer ensemble.
            Ces activités sont gratuites et nécessitent simplement une adhésion à Larchant Animation.
          </p>
          <div class="my-6">
            <NuxtLink to="/activites" class="text-base font-medium text-[var(--color-brand-400)] dark:text-indigo-400">
              Voir toutes nos activités&nbsp;→
            </NuxtLink>
          </div>
        </div>
        <div v-if="activites.length" class="grid grid-cols-2 gap-0.5 mt-12 md:grid-cols-3 lg:mt-0 lg:grid-cols-2">
          <NuxtLink
            v-for="ac in activites"
            :key="ac.id"
            :to="`/activites/${ac.slug}`"
            class="flex flex-col justify-center col-span-1 px-8 pt-8 pb-4 bg-gray-50 hover:bg-slate-300 hover:text-indigo-600 dark:text-slate-200 dark:bg-gray-900/10 dark:hover:bg-slate-600 dark:hover:text-indigo-300"
          >
            <img v-if="tileImage(ac)" :src="tileImage(ac)!" alt="" class="w-full max-h-12 object-contain dark:invert">
            <span class="pt-2 text-center">{{ ac.title }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Liste de diffusion (ancien home/cta.html) -->
    <NewsletterForm :intro="site?.newsletter_texte" />
  </div>
</template>
