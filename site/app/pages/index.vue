<script setup lang="ts">
import type { Article, Atelier, Edition, Evenement, Categorie, SiteParams, Slide } from '~/types'

const today = new Date().toISOString().slice(0, 10)

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters')
const { data: slides } = await useDirectusCollection<Slide>('accueil_slides', { sort: ['sort'], fields: ['*'] })
const { getUrl } = useDirectusFile()

const { data: upcoming } = await useDirectusCollection<Edition>('editions', {
  filter: { status: { _eq: 'published' }, date_start: { _gte: today } },
  sort: ['date_start'],
  limit: 4,
  fields: ['*', { evenement: ['slug', 'title', { category: ['*'] }] }]
})

const { data: featured } = await useDirectusCollection<Evenement>('evenements', {
  filter: { status: { _eq: 'published' } },
  sort: ['-featured', 'sort'],
  limit: 6,
  fields: ['id', 'slug', 'title', 'description', 'image', { category: ['*'] }]
})

const { data: articles } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' } },
  sort: ['-date'],
  limit: 3,
  fields: ['*', { category: ['*'] }]
})

const { data: unes } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' }, featured: { _eq: true } },
  sort: ['-date'],
  limit: 3,
  fields: ['*', { category: ['*'] }]
})

const { data: ateliers } = await useDirectusCollection<Atelier>('ateliers', {
  filter: { status: { _eq: 'published' }, actif: { _eq: true } },
  sort: ['title'],
  limit: 8,
  fields: ['id', 'slug', 'title', 'description', 'image', { category: ['*'] }]
})

const evList = computed(() => (upcoming.value?.length ? upcoming.value : []) as (Edition & { evenement: Evenement })[])
</script>

<template>
  <div>
    <!-- Hero -->
    <PageHero
      :kicker="site?.devise || 'Larchant · Forêt de Fontainebleau'"
      :title="site?.hero_title || 'Larchant Animation'"
      :subtitle="site?.hero_subtitle || 'Évènements, ateliers et activités tout au long de l’année.'"
    >
      <div class="mt-7 flex flex-wrap gap-3">
        <UButton v-if="site?.bandeau_texte && site?.bandeau_lien" :to="site.bandeau_lien" size="lg" color="primary" trailing-icon="i-lucide-arrow-right">{{ site.bandeau_texte }}</UButton>
        <UButton to="/evenements" size="lg" :color="site?.bandeau_texte && site?.bandeau_lien ? 'neutral' : 'primary'" :variant="site?.bandeau_texte && site?.bandeau_lien ? 'soft' : 'solid'" trailing-icon="i-lucide-arrow-right">Les évènements</UButton>
        <UButton to="/adherez" size="lg" color="neutral" variant="soft">Adhérer</UButton>
      </div>
    </PageHero>

    <UContainer class="py-14 space-y-16">
      <HomeCarousel :slides="slides || []" />

      <!-- Prochains rendez-vous -->
      <section v-if="evList.length">
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-2xl font-semibold">Prochains rendez-vous</h2>
          <UButton to="/evenements" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">Tout voir</UButton>
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ContentCard
            v-for="e in evList"
            :key="e.id"
            :to="`/evenements/${e.evenement.slug}`"
            :title="e.evenement.title"
            :image="e.affiche"
            :meta="formatDate(e.date_start)"
            :category="(e.evenement.category as Categorie)"
            :badge="e.annule ? 'Annulé' : 'À venir'"
          />
        </div>
      </section>

      <!-- Évènements -->
      <section>
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-2xl font-semibold">Nos évènements</h2>
          <UButton to="/evenements" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">Tout voir</UButton>
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCard
            v-for="ev in featured"
            :key="ev.id"
            :to="`/evenements/${ev.slug}`"
            :title="ev.title"
            :image="ev.image"
            :description="ev.description"
            :category="(ev.category as Categorie)"
          />
        </div>
      </section>

      <!-- À la une -->
      <section v-if="unes?.length">
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-2xl font-semibold">À la une</h2>
          <UButton to="/blog" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">Le blog</UButton>
        </div>
        <div class="grid gap-5 sm:grid-cols-3">
          <ContentCard
            v-for="a in unes"
            :key="`une-${a.id}`"
            :to="`/blog/${a.slug}`"
            :title="a.title"
            :image="a.preview"
            :meta="formatDate(a.date)"
            :description="a.description"
            :category="(a.category as Categorie)"
          />
        </div>
      </section>

      <!-- Actualités -->
      <section v-if="articles?.length">
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-2xl font-semibold">Dernières actualités</h2>
          <UButton to="/blog" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">Le blog</UButton>
        </div>
        <div class="grid gap-5 sm:grid-cols-3">
          <ContentCard
            v-for="a in articles"
            :key="a.id"
            :to="`/blog/${a.slug}`"
            :title="a.title"
            :image="a.preview"
            :meta="formatDate(a.date)"
            :description="a.description"
            :category="(a.category as Categorie)"
          />
        </div>
      </section>

      <!-- Association -->
      <section v-if="site?.asso_texte" class="grid gap-8 md:grid-cols-2 items-center">
        <div>
          <h2 class="text-2xl font-semibold mb-3">{{ site.asso_titre || 'Notre association' }}</h2>
          <MarkdownBody :text="site.asso_texte" />
          <UButton to="/about" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">En savoir plus</UButton>
        </div>
        <img v-if="site.asso_image" :src="getUrl(site.asso_image, { width: '900' })!" alt="" class="rounded-2xl w-full object-cover">
      </section>

      <!-- Ateliers -->
      <section v-if="ateliers?.length">
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-2xl font-semibold">Ateliers de la saison</h2>
          <UButton to="/ateliers" variant="link" color="primary" trailing-icon="i-lucide-arrow-right">Tous les ateliers</UButton>
        </div>
        <MarkdownBody v-if="site?.ateliers_texte" :text="site.ateliers_texte" class="mb-6" />
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ContentCard
            v-for="at in ateliers"
            :key="at.id"
            :to="`/ateliers/${at.slug}`"
            :title="at.title"
            :image="at.image"
            :category="(at.category as Categorie)"
          />
        </div>
      </section>

      <NewsletterForm :intro="site?.newsletter_texte" />
    </UContainer>
  </div>
</template>
