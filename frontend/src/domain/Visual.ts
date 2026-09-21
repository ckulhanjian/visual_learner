export interface VisualCardProps {
  slug: string
  title: string
  kind: string
  summaryMd: string
  attribution: string
  thumbnailSource: string | null
}

export class VisualCard {
  readonly slug: string
  readonly title: string
  readonly kind: string
  readonly summaryMd: string
  readonly attribution: string
  readonly thumbnailSource: string | null

  constructor(props: VisualCardProps) {
    this.slug = props.slug
    this.title = props.title
    this.kind = props.kind
    this.summaryMd = props.summaryMd
    this.attribution = props.attribution
    this.thumbnailSource = props.thumbnailSource
  }
}

export interface ResourceProps {
  id: number
  label: string
  url: string
  kind: string
}

export class Resource {
  readonly id: number
  readonly label: string
  readonly url: string
  readonly kind: string

  constructor(props: ResourceProps) {
    this.id = props.id
    this.label = props.label
    this.url = props.url
    this.kind = props.kind
  }
}

export interface VisualCategoryRef {
  slug: string
  name: string
  color: string
}

export interface VisualDetailProps {
  slug: string
  title: string
  kind: string
  source: string
  assetPath: string | null
  themeAffinity: string
  origin: string
  generator: string | null
  createdOn: string | null
  context: string
  course: string | null
  summaryMd: string
  notesMd: string
  needsSandbox: boolean
  attribution: string
  category: VisualCategoryRef
  tags: string[]
  resources: Resource[]
}

// The full `/v/:slug` shape — everything VisualCardSchema sends plus the
// fields only the detail page needs (source, notes, resources, ...). A
// separate class from VisualCard rather than a superset/subclass: the two
// pages that use them (the preview grid, the detail page) genuinely want
// different, non-overlapping shapes, and a shared base would just be the
// handful of fields they happen to both have.
export class VisualDetail {
  readonly slug: string
  readonly title: string
  readonly kind: string
  readonly source: string
  readonly assetPath: string | null
  readonly themeAffinity: string
  readonly origin: string
  readonly generator: string | null
  readonly createdOn: string | null
  readonly context: string
  readonly course: string | null
  readonly summaryMd: string
  readonly notesMd: string
  readonly needsSandbox: boolean
  readonly attribution: string
  readonly category: VisualCategoryRef
  readonly tags: string[]
  readonly resources: Resource[]

  constructor(props: VisualDetailProps) {
    this.slug = props.slug
    this.title = props.title
    this.kind = props.kind
    this.source = props.source
    this.assetPath = props.assetPath
    this.themeAffinity = props.themeAffinity
    this.origin = props.origin
    this.generator = props.generator
    this.createdOn = props.createdOn
    this.context = props.context
    this.course = props.course
    this.summaryMd = props.summaryMd
    this.notesMd = props.notesMd
    this.needsSandbox = props.needsSandbox
    this.attribution = props.attribution
    this.category = props.category
    this.tags = props.tags
    this.resources = props.resources
  }
}
