import { Resource, VisualCard, VisualDetail, type VisualCategoryRef } from '../domain/Visual'
import { apiGet, apiPost } from './client'

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
  asset_path: string | null
  needs_sandbox: boolean
}

export function toVisualCard(dto: VisualCardDTO): VisualCard {
  return new VisualCard({
    slug: dto.slug,
    title: dto.title,
    kind: dto.kind,
    summaryMd: dto.summary_md,
    attribution: dto.attribution,
    thumbnailSource: dto.thumbnail_source,
    assetPath: dto.asset_path,
    needsSandbox: dto.needs_sandbox,
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
  status: string
  resources: ResourceDTO[]
}

function toVisualDetail(dto: VisualDetailDTO): VisualDetail {
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
    status: dto.status,
    category: dto.category,
    tags: dto.tags,
    resources: dto.resources.map((resource) => new Resource(resource)),
  })
}

export async function fetchVisualDetail(slug: string): Promise<VisualDetail> {
  const dto = await apiGet<VisualDetailDTO>(`/visuals/${encodeURIComponent(slug)}`)
  return toVisualDetail(dto)
}

export interface NewResourceDraft {
  label: string
  url: string
  kind: string
}

// ConceptForm's own draft shape — camelCase, matching every other domain
// type here, mapped to VisualCreateSchema's snake_case payload only at the
// point of sending it. Not a class: this is transient form state (CLAUDE.md's
// "OOP in the domain/service layers" is about the entities the API returns,
// not a form's own working copy of one that doesn't exist yet).
export interface NewVisualDraft {
  title: string
  kind: string
  source: string
  assetPath: string | null
  themeAffinity: string
  origin: string
  generator: string
  createdOn: string
  context: string
  course: string
  summaryMd: string
  notesMd: string
  categorySlug: string
  tags: string[]
  resources: NewResourceDraft[]
}

// `POST /visuals` is open (docs/ARCHITECTURE.md §5) — `writeKey` is what
// decides queued-vs-live (an anonymous request lands `pending`), not
// whether the request is allowed at all. Returns the created visual's own
// detail shape, same as `fetchVisualDetail` — the response already carries
// whatever slug the backend generated from the title.
export async function createVisual(draft: NewVisualDraft, writeKey: string | undefined): Promise<VisualDetail> {
  const dto = await apiPost<VisualDetailDTO>(
    '/visuals',
    {
      title: draft.title,
      kind: draft.kind,
      source: draft.source,
      asset_path: draft.assetPath,
      theme_affinity: draft.themeAffinity,
      origin: draft.origin,
      generator: draft.generator || null,
      created_on: draft.createdOn || null,
      context: draft.context,
      course: draft.course || null,
      summary_md: draft.summaryMd,
      notes_md: draft.notesMd,
      category_slug: draft.categorySlug,
      tags: draft.tags,
      resources: draft.resources.map((resource) => ({ label: resource.label, url: resource.url, kind: resource.kind })),
    },
    writeKey,
  )
  return toVisualDetail(dto)
}
