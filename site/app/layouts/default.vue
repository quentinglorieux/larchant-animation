<script setup lang="ts">
import type { Atelier, Categorie, Evenement, InfosGenerales, SiteParams } from '~/types'

useSeoMeta({ ogSiteName: 'Larchant Animation', ogType: 'website' })

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters', { fields: ['facebook_url', 'instagram_url', 'youtube_url'] })
const { data: infos } = await useDirectusSingleton<InfosGenerales>('infos_generales')
const { data: navAteliers } = await useDirectusCollection<Atelier>('ateliers', {
  filter: { status: { _eq: 'published' }, actif: { _eq: true } },
  fields: ['id', 'slug', 'title', 'animateur', 'horaires', 'picto'],
  limit: -1
})
const { data: navActivites } = await useDirectusCollection<Atelier>('activites', {
  filter: { status: { _eq: 'published' } },
  fields: ['id', 'slug', 'title', 'picto'],
  sort: ['title'],
  limit: -1
})
const { data: navEvenements } = await useDirectusCollection<Evenement>('evenements', {
  filter: { status: { _eq: 'published' } },
  fields: ['id', 'slug', 'title', 'description', 'picto', { category: ['name'] }],
  limit: -1
})
const pictoUrl = usePicto()

interface SubItem { label: string, to: string, hint?: string | null, icon?: string | null }
interface NavItem { label: string, to?: string, children?: SubItem[] }

const catName = (c: unknown) => (c && typeof c === 'object' ? (c as Categorie).name : null)

const nav = computed<NavItem[]>(() => [
  { label: 'L’association', to: '/about' },
  {
    label: 'Ateliers',
    children: [
      ...sortByLogoOrder('ateliers', navAteliers.value).map(a => ({
        label: a.title,
        to: `/ateliers/${a.slug}`,
        hint: a.horaires || a.animateur,
        icon: pictoUrl(a)
      })),
      { label: 'Tous les ateliers', to: '/ateliers' }
    ]
  },
  {
    label: 'Activités',
    children: [
      ...sortByLogoOrder('activites', navActivites.value).map(a => ({
        label: a.title,
        to: `/activites/${a.slug}`,
        icon: pictoUrl(a)
      })),
      { label: 'Toutes les activités', to: '/activites' }
    ]
  },
  { label: 'Médiathèque', to: '/mediatheque' },
  { label: 'Les Savanturiers (Multisports)', to: '/club-multisports' },
  {
    label: 'Événements',
    children: [
      ...sortByLogoOrder('evenements', navEvenements.value).map(e => ({
        label: e.title,
        to: `/evenements/${e.slug}`,
        hint: e.description || catName(e.category),
        icon: pictoUrl(e)
      })),
      { label: 'Tous les événements', to: '/evenements' }
    ]
  },
  { label: 'Contact', to: '/contact' }
])

const footerNav = [
  { label: 'L’association', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Les ateliers', to: '/ateliers' },
  { label: 'Les activités', to: '/activites' },
  { label: 'Les événements', to: '/evenements' },
  { label: 'Médiathèque', to: '/mediatheque' },
  { label: 'Newsletters', to: '/newsletters' },
  { label: 'Adhérer', to: '/adherez' },
  { label: 'Contact', to: '/contact' }
]

const open = ref(false)
const openMenu = ref<string | null>(null)
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false; openMenu.value = null })

const toggleMenu = (label: string) => { openMenu.value = openMenu.value === label ? null : label }

const navEl = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (openMenu.value && navEl.value && !navEl.value.contains(e.target as Node)) openMenu.value = null
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') openMenu.value = null }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })

const colorMode = useColorMode()
const toggleDark = () => { openMenu.value = null; colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }

const itemClass = 'px-4 py-2 mt-2 text-sm font-semibold rounded-lg lg:mt-0 lg:ml-2 xl:ml-4 hover:text-white focus:text-white hover:bg-[var(--color-brand-600)] focus:bg-[var(--color-brand-700)] focus:outline-none'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-zinc-100 dark:bg-gray-800">
    <!-- Navigation (ancien nav.html) -->
    <header class="top-0 z-50 w-full text-gray-200 bg-gray-900 border-2 border-gray-900 border-b-stone-200/10 lg:sticky">
      <div class="flex flex-col max-w-full px-4 mx-auto lg:items-center lg:justify-between lg:flex-row lg:px-6 xl:px-8">
        <div class="flex flex-row items-center justify-between p-4">
          <AppLogo />
          <button
            type="button"
            class="rounded-lg lg:hidden focus:outline-none"
            :aria-expanded="open"
            aria-controls="menu-principal"
            aria-label="Menu"
            @click="open = !open"
          >
            <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-6" />
          </button>
        </div>

        <nav
          id="menu-principal"
          ref="navEl"
          :class="open ? 'flex' : 'hidden'"
          class="flex-col flex-grow pb-4 lg:pb-0 lg:flex lg:justify-end lg:flex-row lg:items-center"
          aria-label="Navigation principale"
        >
          <template v-for="item in nav" :key="item.label">
            <div v-if="item.children" class="relative">
              <button
                type="button"
                :class="[itemClass, 'flex flex-row items-center w-full text-left bg-transparent lg:w-auto lg:inline-flex', openMenu === item.label ? 'bg-[var(--color-brand-600)] text-white' : '']"
                :aria-expanded="openMenu === item.label"
                @click="toggleMenu(item.label)"
              >
                <span>{{ item.label }}</span>
                <UIcon name="i-lucide-chevron-down" class="size-4 ml-1 transition-transform duration-200" :class="openMenu === item.label ? 'rotate-180' : ''" />
              </button>
              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div v-if="openMenu === item.label" class="z-30 w-full mt-2 origin-top-right lg:absolute lg:right-0 lg:max-w-sm lg:w-screen">
                  <div class="px-2 pt-2 pb-4 bg-white rounded-md shadow-lg text-zinc-900 max-h-[75vh] overflow-y-auto">
                    <div class="grid grid-cols-1 gap-1">
                      <NuxtLink
                        v-for="sub in item.children"
                        :key="sub.to"
                        :to="sub.to"
                        class="flex items-center p-2 bg-transparent rounded-lg group hover:text-white focus:text-white hover:bg-[var(--color-brand-600)] focus:bg-[var(--color-brand-700)] focus:outline-none"
                      >
                        <div class="p-3 text-white bg-[var(--color-brand-600)] rounded-lg group-hover:bg-gray-900 shrink-0">
                          <img v-if="sub.icon" :src="sub.icon" alt="" class="size-6 invert" loading="lazy">
                          <UIcon v-else name="i-lucide-arrow-right" class="size-6 block" />
                        </div>
                        <div class="ml-3">
                          <p class="font-semibold">{{ sub.label }}</p>
                          <p v-if="sub.hint && sub.hint !== sub.label" class="text-sm">{{ sub.hint }}</p>
                        </div>
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
            <NuxtLink v-else :to="item.to!" :class="itemClass">{{ item.label }}</NuxtLink>
          </template>

          <button
            type="button"
            class="self-start p-2 mt-2 text-sm text-gray-400 rounded-lg lg:mt-0 lg:ml-2 hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-700"
            :aria-label="colorMode.value === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
            @click="toggleDark"
          >
            <ClientOnly>
              <UIcon :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" class="size-5 block" />
              <template #fallback><span class="size-5 block" /></template>
            </ClientOnly>
          </button>
        </nav>
      </div>
    </header>

    <!-- Contenu -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Pied de page (ancien footer.html) -->
    <footer class="bg-gray-900">
      <div class="max-w-md px-4 py-12 mx-auto overflow-hidden sm:max-w-3xl sm:px-6 lg:max-w-7xl lg:px-8">
        <nav class="flex flex-wrap justify-center -mx-5 -my-2" aria-label="Pied de page">
          <div v-for="l in footerNav" :key="l.to" class="px-5 py-2">
            <NuxtLink :to="l.to" class="text-base text-gray-400 hover:text-gray-300">{{ l.label }}</NuxtLink>
          </div>
        </nav>

        <div v-if="infos?.adresse || infos?.email || infos?.telephone" class="mt-8 flex flex-col items-center gap-1 text-sm text-gray-400 text-center">
          <p v-if="infos?.adresse" class="whitespace-pre-line">{{ infos.adresse }}</p>
          <p v-if="infos?.email || infos?.telephone" class="flex flex-wrap justify-center gap-x-4">
            <a v-if="infos?.email" :href="`mailto:${infos.email}`" class="hover:text-gray-300">{{ infos.email }}</a>
            <span v-if="infos?.telephone">{{ infos.telephone }}</span>
          </p>
        </div>

        <div class="flex justify-center mt-8 space-x-6">
          <a v-if="site?.facebook_url" :href="site.facebook_url" target="_blank" rel="noopener" class="text-gray-400 hover:text-gray-300">
            <span class="sr-only">Facebook</span>
            <UIcon name="i-simple-icons-facebook" class="size-6 block" />
          </a>
          <a v-if="site?.instagram_url" :href="site.instagram_url" target="_blank" rel="noopener" class="text-gray-400 hover:text-gray-300">
            <span class="sr-only">Instagram</span>
            <UIcon name="i-simple-icons-instagram" class="size-6 block" />
          </a>
          <a v-if="site?.youtube_url" :href="site.youtube_url" target="_blank" rel="noopener" class="text-gray-400 hover:text-gray-300">
            <span class="sr-only">YouTube</span>
            <UIcon name="i-simple-icons-youtube" class="size-6 block" />
          </a>
        </div>
        <p class="mt-8 text-base text-center text-gray-400">
          © {{ new Date().getFullYear() }} Larchant Animation. Tous droits réservés.
        </p>
        <p class="mt-2 text-sm text-center text-gray-600">
          Fait avec ❤️ par <span class="font-light uppercase">Quentin</span> <span class="uppercase">Glorieux</span>
        </p>
      </div>
    </footer>
  </div>
</template>
