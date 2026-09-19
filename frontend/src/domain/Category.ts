export interface CategoryProps {
  id: number
  slug: string
  name: string
  color: string
  blurb: string
  position: number
  publishedCount: number
}

export class Category {
  readonly id: number
  readonly slug: string
  readonly name: string
  readonly color: string
  readonly blurb: string
  readonly position: number
  readonly publishedCount: number

  constructor(props: CategoryProps) {
    this.id = props.id
    this.slug = props.slug
    this.name = props.name
    this.color = props.color
    this.blurb = props.blurb
    this.position = props.position
    this.publishedCount = props.publishedCount
  }

  // position is explicit, not alphabetical — see docs/DECISIONS.md on the arc
  // reading better when the longest names aren't adjacent.
  static sortByPosition(categories: Category[]): Category[] {
    return [...categories].sort((a, b) => a.position - b.position)
  }
}
