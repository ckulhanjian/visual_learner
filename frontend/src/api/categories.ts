import { Category } from '../domain/Category'
import type { VisualCard } from '../domain/Visual'
import { apiGet } from './client'
import { toVisualCard, type VisualCardDTO } from './visuals'

// The wire shape GET /categories actually returns (snake_case, per
// docs/ARCHITECTURE.md's CategorySchema) — kept private to this module so the
// rest of the app only ever sees the camelCase domain type.
interface CategoryDTO {
  id: number
  slug: string
  name: string
  color: string
  blurb: string
  position: number
  published_count: number
}

export async function fetchCategories(): Promise<Category[]> {
  const dtos = await apiGet<CategoryDTO[]>('/categories')
  const categories = dtos.map(
    (dto) =>
      new Category({
        id: dto.id,
        slug: dto.slug,
        name: dto.name,
        color: dto.color,
        blurb: dto.blurb,
        position: dto.position,
        publishedCount: dto.published_count,
      }),
  )
  return Category.sortByPosition(categories)
}

// GET /categories/<slug> dumps CategorySchema (no published_count — that's
// specific to the list endpoint's own aggregate query) plus a `visuals`
// array the route handler adds by hand, not part of the schema itself.
interface CategoryDetailDTO {
  id: number
  slug: string
  name: string
  color: string
  blurb: string
  position: number
  visuals: VisualCardDTO[]
}

export interface CategoryDetail {
  category: Category
  visuals: VisualCard[]
}

export async function fetchCategoryDetail(slug: string): Promise<CategoryDetail> {
  const dto = await apiGet<CategoryDetailDTO>(`/categories/${encodeURIComponent(slug)}`)
  const visuals = dto.visuals.map(toVisualCard)
  return {
    category: new Category({
      id: dto.id,
      slug: dto.slug,
      name: dto.name,
      color: dto.color,
      blurb: dto.blurb,
      position: dto.position,
      // The only visuals this endpoint returns are published ones
      // (CategoryService.published_visuals) — length is the real count.
      publishedCount: visuals.length,
    }),
    visuals,
  }
}
