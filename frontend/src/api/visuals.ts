import { VisualCard } from '../domain/Visual'
import { apiGet } from './client'

interface VisualCardDTO {
  slug: string
  title: string
  kind: string
  summary_md: string
  attribution: string
  thumbnail_source: string | null
}

export async function fetchVisualsByCategory(categorySlug: string): Promise<VisualCard[]> {
  const dtos = await apiGet<VisualCardDTO[]>(`/visuals?category=${encodeURIComponent(categorySlug)}`)
  return dtos.map(
    (dto) =>
      new VisualCard({
        slug: dto.slug,
        title: dto.title,
        kind: dto.kind,
        summaryMd: dto.summary_md,
        attribution: dto.attribution,
        thumbnailSource: dto.thumbnail_source,
      }),
  )
}
