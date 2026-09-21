import { Link } from 'react-router-dom'
import type { VisualCard } from '../domain/Visual'
import { toSvgDataUri } from '../renderers/svgDataUri'

interface VisualPreviewCardProps {
  visual: VisualCard
}

// Links to `/v/:slug` — a real Link now that page exists, not a disabled
// stub, matching the same pattern `/c/:slug` and ExpandCell went through
// (docs/DECISIONS.md). The Link renders as `display: contents` so it's
// transparent to the <li>'s own flex layout and hover effects: the visible
// content is still directly the li's children, just wrapped in something
// clickable.
export function VisualPreviewCard({ visual }: VisualPreviewCardProps) {
  return (
    <li className="border-line group bg-paper relative flex flex-col overflow-hidden rounded-lg border text-left transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.15] hover:shadow-xl">
      <Link to={`/v/${visual.slug}`} className="contents">
        <div className="bg-surface border-line flex aspect-square items-center justify-center overflow-hidden border-b">
          {visual.thumbnailSource ? (
            // Rendered via <img>, not dangerouslySetInnerHTML: a data URI loaded
            // as an image is never script-executable, unlike inlining SVG
            // markup straight into the DOM (which is what the `svg` renderer
            // needs real sanitization for — see docs/ARCHITECTURE.md §4).
            <img
              src={toSvgDataUri(visual.thumbnailSource)}
              alt=""
              className="h-full w-full object-contain p-2 transition-all duration-200 group-hover:p-0"
            />
          ) : (
            <span className="text-ink-muted font-mono text-[10px] uppercase">{visual.kind}</span>
          )}
        </div>
        <div className="min-w-0 p-2">
          <p className="truncate font-mono text-xs">{visual.title}</p>
          <p className="text-ink-muted mt-1 line-clamp-2 text-[11px]">{visual.summaryMd}</p>
        </div>
      </Link>
    </li>
  )
}
