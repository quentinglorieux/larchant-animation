import { createDirectus, rest, readItems, readItem, readSingleton } from '@directus/sdk'

export function useDirectus() {
  const config = useRuntimeConfig()
  return createDirectus(config.public.directusUrl as string).with(rest())
}

export function useDirectusFile() {
  const config = useRuntimeConfig()

  function getUrl(fileId: string | null | undefined, params?: Record<string, string | number>) {
    if (!fileId) return null
    const base = `${config.public.directusUrl}/assets/${fileId}`
    if (!params) return base
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return `${base}?${qs}`
  }

  return { getUrl }
}

export async function useDirectusCollection<T>(
  collection: string,
  query: Parameters<typeof readItems>[1] = {}
) {
  const directus = useDirectus()
  const { data, error, pending } = await useAsyncData(
    `${collection}-${JSON.stringify(query)}`,
    () => directus.request(readItems(collection as never, query)) as Promise<T[]>
  )
  return { data, error, pending }
}

export async function useDirectusItem<T>(collection: string, id: string | number, query = {}) {
  const directus = useDirectus()
  const { data, error, pending } = await useAsyncData(
    `${collection}-${id}-${JSON.stringify(query)}`,
    () => directus.request(readItem(collection as never, id, query)) as Promise<T>
  )
  return { data, error, pending }
}

export async function useDirectusSingleton<T>(collection: string, query = {}) {
  const directus = useDirectus()
  const { data, error, pending } = await useAsyncData(
    `singleton-${collection}`,
    () => directus.request(readSingleton(collection as never, query)) as Promise<T>
  )
  return { data, error, pending }
}
