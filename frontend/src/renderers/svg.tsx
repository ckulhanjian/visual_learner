import { toSvgDataUri } from './svgDataUri'

interface SvgRendererProps {
  source: string
}

// Rendered via <img>, not dangerouslySetInnerHTML: a data URI loaded as an
// image is never script-executable, unlike inlining SVG markup straight
// into the DOM — which is what would need real sanitization first.
export function SvgRenderer({ source }: SvgRendererProps) {
  return <img src={toSvgDataUri(source)} alt="" className="h-full w-full object-contain" />
}
