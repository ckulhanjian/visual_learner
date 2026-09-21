import { Resource, VisualCard, VisualDetail, type VisualCategoryRef } from '../domain/Visual'
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

interface ResourceDTO {
  id: number
  label: string
  url: string
  kind: string
}

// VisualDetailSchema on the backend extends VisualCardSchema, so its DTO
// does the same here rather than repeating the shared fields.
interface VisualDetailDTO extends VisualCardDTO {
  theme_affinity: string
  created_on: string | null
  needs_sandbox: boolean
  category: VisualCategoryRef
  tags: string[]
  source: string
  asset_path: string | null
  origin: string
  generator: string | null
  context: string
  course: string | null
  notes_md: string
  resources: ResourceDTO[]
}

export async function fetchVisualDetail(slug: string): Promise<VisualDetail> {
  const dto = await apiGet<VisualDetailDTO>(`/visuals/${encodeURIComponent(slug)}`)
  return new VisualDetail({
    slug: dto.slug,
    title: dto.title,
    kind: dto.kind,
    source: dto.source,
    assetPath: dto.asset_path,
    themeAffinity: dto.theme_affinity,
    origin: dto.origin,
    generator: dto.generator,
    createdOn: dto.created_on,
    context: dto.context,
    course: dto.course,
    summaryMd: dto.summary_md,
    notesMd: dto.notes_md,
    needsSandbox: dto.needs_sandbox,
    attribution: dto.attribution,
    category: dto.category,
    tags: dto.tags,
    resources: dto.resources.map((resource) => new Resource(resource)),
  })
}
