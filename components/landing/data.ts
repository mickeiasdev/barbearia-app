import { createClient } from '@/lib/supabase/server'
import { waLink } from '@/lib/whatsapp'
import { initials } from '@/lib/utils'
import { dateKey } from '@/lib/tz'
import type { Barber, Establishment, Service } from '@/lib/types'
import type { HostWorkspace } from '@/lib/site'

export interface LandingReview {
  rating: number
  comment: string | null
  author: string
  date: string
}

export interface LandingData {
  est: Establishment
  barber: Barber | null
  /** nome de exibição configurável (fallback: nome do barbeiro) */
  displayName: string
  /** frase de apresentação configurável (fallback: bio do barbeiro) */
  tagline: string | null
  bannerUrl: string | null
  layout: 1 | 2 | 3
  initialsName: string
  rating: number | null
  reviewCount: number
  reviews: LandingReview[]
  services: Service[]
  photos: { url: string; caption: string | null }[]
  waHref: string | null
  agendarHref: string
  serviceHref: (serviceId: string) => string
}

/** Busca tudo que a landing precisa — usada pelos 3 layouts. */
export async function getLandingData(workspace: HostWorkspace): Promise<LandingData> {
  const { establishment: est, barbers } = workspace
  const main = barbers[0] ?? null

  const supabase = await createClient()
  const barberIds = barbers.length > 0
    ? barbers.map((b) => b.id)
    : ['00000000-0000-0000-0000-000000000000']

  const [servicesRes, photosRes, reviewsRes] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('establishment_id', est.id)
      .eq('is_active', true)
      .order('price_cents'),
    supabase
      .from('barber_photos')
      .select('url, caption')
      .in('barber_id', barberIds)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('reviews')
      .select('rating, comment, created_at, client:profiles(full_name)')
      .eq('is_visible', true)
      .in('barber_id', barberIds)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const services = (servicesRes.data ?? []) as Service[]
  const photos = (photosRes.data ?? []) as { url: string; caption: string | null }[]
  const rawReviews = (reviewsRes.data ?? []) as unknown as {
    rating: number
    comment: string | null
    created_at: string
    client: { full_name: string } | null
  }[]
  const reviews: LandingReview[] = rawReviews.map((r) => ({
    rating: r.rating,
    comment: r.comment,
    author: r.client?.full_name?.split(' ')[0] ?? 'Cliente',
    date: dateKey(r.created_at).split('-').reverse().join('/'),
  }))

  const rating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : null

  const layout = ((est.layout_theme ?? 1) === 2 ? 2 : (est.layout_theme ?? 1) === 3 ? 3 : 1) as 1 | 2 | 3

  return {
    est,
    barber: main,
    displayName: est.display_name ?? main?.full_name ?? est.name,
    tagline: est.tagline ?? main?.bio ?? null,
    bannerUrl: est.banner_url,
    layout,
    initialsName: initials(main?.full_name ?? est.name),
    rating,
    reviewCount: reviews.length,
    reviews: reviews.slice(0, 6),
    services,
    photos,
    waHref: est.whatsapp
      ? waLink(est.whatsapp, 'Olá! Vi seu site e quero agendar um horário.')
      : null,
    agendarHref: main ? '/agendar?barbeiro=' + main.id : '/agendar',
    serviceHref: (serviceId: string) =>
      main ? '/agendar?barbeiro=' + main.id + '&servico=' + serviceId : '/agendar?servico=' + serviceId,
  }
}
