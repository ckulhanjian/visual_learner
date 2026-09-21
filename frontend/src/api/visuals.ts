import { VisualCard } from '../domain/Visual'
import { apiGet } from './client'

// The wire shape of a VisualCardSchema dump (snake_case) — kept private to
// this module. Exported as a type so api/categories.ts (whose
// GET /categories/:slug response embeds a list of these) can reuse the one
// mapping to the domain type without duplicating it.
export interface VisualCardDTO {
  slug: string
  title: string
  kind: string
  summary_md: string
  attribution: string
  thumbnail_source: string | null
}

export function toVisualCard(dto: VisualCardDTO): VisualCard {
  return new VisualCard({
    slug: dto.slug,
    title: dto.title,
    kind: dto.kind,
    summaryMd: dto.summary_md,
    attribution: dto.attribution,
    thumbnailSource: dto.thumbnail_source,
  })
}

export async function fetchVisualsByCategory(categorySlug: string): Promise<VisualCard[]> {
  const dtos = await apiGet<VisualCardDTO[]>(`/visuals?category=${encodeURIComponent(categorySlug)}`)
  return dtos.map(toVisualCard)
}
