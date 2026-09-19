export class TopicNode {
  readonly slug: string
  readonly name: string
  readonly children: TopicNode[]

  constructor(slug: string, name: string, children: TopicNode[] = []) {
    this.slug = slug
    this.name = name
    this.children = children
  }

  get hasChildren(): boolean {
    return this.children.length > 0
  }
}

export interface CategoryTopics {
  categorySlug: string
  categoryName: string
  categoryColor: string
  topics: TopicNode[]
}
