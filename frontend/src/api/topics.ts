import { TopicNode, type CategoryTopics } from '../domain/Topic'
import { apiGet } from './client'

interface TopicNodeDTO {
  slug: string
  name: string
  children: TopicNodeDTO[]
}

interface CategoryTopicsDTO {
  category: { slug: string; name: string; color: string }
  topics: TopicNodeDTO[]
}

function toTopicNode(dto: TopicNodeDTO): TopicNode {
  return new TopicNode(
    dto.slug,
    dto.name,
    dto.children.map(toTopicNode),
  )
}

export async function fetchCategoryTopics(): Promise<CategoryTopics[]> {
  const dtos = await apiGet<CategoryTopicsDTO[]>('/topics')
  return dtos.map((dto) => ({
    categorySlug: dto.category.slug,
    categoryName: dto.category.name,
    categoryColor: dto.category.color,
    topics: dto.topics.map(toTopicNode),
  }))
}
