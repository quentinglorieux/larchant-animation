export const useStudio = () => {
  const { client, user } = useDirectusAuth()
  const toast = useToast()
  const config = useRuntimeConfig()

  const DIRECTUS_URL = config.public.directusUrl as string
  const DIRECTUS_ASSETS = `${DIRECTUS_URL}/assets`

  const assetUrl = (
    id: string | null | undefined,
    params?: Record<string, string | number>
  ): string | null => {
    if (!id) return null
    const base = `/api/directus/assets/${id}`
    if (!params) return base
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return `${base}?${qs}`
  }

  const slugify = (text: string): string =>
    (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const uploadToDirectus = async (file: File): Promise<string | null> => {
    const token = await client.value.getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/directus/files', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })
    const data = await res.json()
    return data.data?.id ?? null
  }

  const triggerFileUpload = (
    onSuccess: (id: string) => void,
    options?: { accept?: string }
  ) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = options?.accept || '*/*'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const id = await uploadToDirectus(file)
        if (id) onSuccess(id)
      } catch {
        toast.add({ title: 'Échec de l’envoi du fichier', color: 'error' })
      }
    }
    input.click()
  }

  const triggerImageUpload = (onSuccess: (id: string) => void) => {
    triggerFileUpload(onSuccess, { accept: 'image/*' })
  }

  return {
    client, user, toast,
    DIRECTUS_URL, DIRECTUS_ASSETS,
    assetUrl, slugify, uploadToDirectus, triggerFileUpload, triggerImageUpload
  }
}
