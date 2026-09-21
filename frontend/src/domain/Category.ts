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

// A local, never-fetched stand-in for "no category selected yet" — the
// spinner's first, discrete stop, matching no real backend row (id -1,
// position -1). Compared by slug ('home'), not identity, since it crosses
// a prop boundary (CategorySpinner -> Home). See docs/DECISIONS.md on the
// two-position hero layout this drives.
export const HOME_CATEGORY = new Category({
  id: -1,
  slug: 'home',
  name: 'Home',
  color: '#8f887a',
  blurb: '',
  position: -1,
  publishedCount: 0,
})
