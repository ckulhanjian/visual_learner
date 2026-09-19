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
