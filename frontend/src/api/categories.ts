import { Category } from '../domain/Category'
import { apiGet } from './client'

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
