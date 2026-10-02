import { createDirectus, rest, readItems } from '@directus/sdk'

type Row = { slug?: string, annee?: number, evenement?: { slug?: string } }

export default defineCachedEventHandler(async (event) => {
  const { directusUrl, siteUrl } = useRuntimeConfig().public
  const d = createDirectus(directusUrl as string).with(rest())
  const pub = { status: { _eq: 'published' } }
  const get = (c: string, fields: unknown[]) => d.request(readItems(c as never, { filter: pub, fields, limit: -1 } as never)) as Promise<Row[]>
  const [ev, ed, ar, at, ac, pg] = await Promise.all([
    get('evenements', ['slug']), get('editions', ['annee', { evenement: ['slug'] }]), get('articles', ['slug']),
    get('ateliers', ['slug']), get('activites', ['slug']), get('pages', ['slug'])
  ])
  const paths = ['/', '/evenements', '/ateliers', '/activites', '/blog', '/newsletters',
    ...ev.map(x => `/evenements/${x.slug}`),
    ...ed.filter(x => x.evenement?.slug && x.annee).map(x => `/evenements/${x.evenement!.slug}/${x.annee}`),
    ...ar.map(x => `/blog/${x.slug}`), ...at.map(x => `/ateliers/${x.slug}`),
    ...ac.map(x => `/activites/${x.slug}`), ...pg.map(x => `/${x.slug}`)]
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const body = paths.map(p => `  <url><loc>${siteUrl}${encodeURI(p)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}, { maxAge: 600 })
