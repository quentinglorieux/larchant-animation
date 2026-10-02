<script setup lang="ts">
import type { InfosGenerales, SiteParams } from '~/types'

const nav = [
  { label: 'L’association', to: '/about' },
  { label: 'Évènements', to: '/evenements' },
  { label: 'Ateliers', to: '/ateliers' },
  { label: 'Activités', to: '/activites' },
  { label: 'Savanturiers', to: '/club-multisports' },
  { label: 'Médiathèque', to: '/mediatheque' },
  { label: 'Actualités', to: '/blog' },
  { label: 'Contact', to: '/contact' },
  { label: 'Adhérer', to: '/adherez' }
]

useSeoMeta({ ogSiteName: 'Larchant Animation', ogType: 'website' })

const open = ref(false)
const route = useRoute()
watch(() => route.path, () => { open.value = false })

const colorMode = useColorMode()
const toggleDark = () => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters', { fields: ['facebook_url', 'instagram_url', 'youtube_url'] })
const { data: infos } = await useDirectusSingleton<InfosGenerales>('infos_generales')
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-paper)]">
    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-[var(--color-rule)] bg-[color-mix(in_oklab,var(--color-paper)_88%,transparent)] backdrop-blur">
      <UContainer class="flex items-center justify-between h-16">
        <AppLogo />

        <nav class="hidden xl:flex items-center gap-1">
          <UButton
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            variant="ghost"
            color="neutral"
            class="text-[var(--color-ink-2)] hover:text-[var(--color-forest-600)]"
          >
            {{ item.label }}
          </UButton>
          <UButton
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            variant="ghost"
            color="neutral"
            class="ml-1"
            aria-label="Basculer le thème"
            @click="toggleDark"
          />
        </nav>

        <UButton
          class="xl:hidden"
          :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
          variant="ghost"
          color="neutral"
          aria-label="Menu"
          @click="open = !open"
        />
      </UContainer>

      <!-- Menu mobile -->
      <div v-if="open" class="xl:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
        <UContainer class="py-3 flex flex-col gap-1">
          <UButton
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            variant="ghost"
            color="neutral"
            block
            class="justify-start"
          >
            {{ item.label }}
          </UButton>
          <UButton :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" variant="ghost" color="neutral" block class="justify-start" @click="toggleDark">
            Thème
          </UButton>
        </UContainer>
      </div>
    </header>

    <!-- Contenu -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="mt-16 border-t border-[var(--color-rule)] bg-[var(--color-paper-2)]">
      <UContainer class="py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <AppLogo />
          <p class="mt-3 text-sm text-[var(--color-ink-3)]">
            Association culturelle et sportive de Larchant, au pied de la forêt de Fontainebleau.
          </p>
        </div>
        <div class="text-sm text-[var(--color-ink-2)] space-y-1">
          <p class="monotag mb-2">Contact</p>
          <p v-if="infos?.adresse" class="whitespace-pre-line">{{ infos.adresse }}</p>
          <p v-if="infos?.email">
            <a :href="`mailto:${infos.email}`" class="hover:text-[var(--color-forest-600)]">{{ infos.email }}</a>
          </p>
          <p v-if="infos?.telephone">{{ infos.telephone }}</p>
        </div>
        <div class="text-sm">
          <p class="monotag mb-2">Suivez-nous</p>
          <div class="flex gap-2">
            <UButton v-if="site?.facebook_url" :to="site.facebook_url" target="_blank" icon="i-simple-icons-facebook" variant="soft" color="neutral" />
            <UButton v-if="site?.instagram_url" :to="site.instagram_url" target="_blank" icon="i-simple-icons-instagram" variant="soft" color="neutral" />
            <UButton v-if="site?.youtube_url" :to="site.youtube_url" target="_blank" icon="i-simple-icons-youtube" variant="soft" color="neutral" />
          </div>
          <NuxtLink to="/mediatheque" class="mt-4 inline-block text-[var(--color-ink-3)] hover:text-[var(--color-forest-600)]">Médiathèque</NuxtLink>
        </div>
      </UContainer>
      <div class="border-t border-[var(--color-rule)] py-4">
        <UContainer class="text-xs text-[var(--color-ink-3)] flex justify-between">
          <span>© {{ new Date().getFullYear() }} Larchant Animation</span>
          <NuxtLink to="/about" class="hover:text-[var(--color-forest-600)]">L'association</NuxtLink>
        </UContainer>
      </div>
    </footer>
  </div>
</template>
