import { Link } from 'react-router-dom'
import type { Category } from '../domain/Category'
import type { VisualCard } from '../domain/Visual'
import { useTheme } from '../theme/useTheme'
import { VisualThumbnail } from './VisualThumbnail'

interface VisualPreviewCardProps {
  visual: VisualCard
  category: Category
}

// Links to `/v/:slug` — a real Link now that page exists, not a disabled
// stub, matching the same pattern `/c/:slug` and ExpandCell went through
// (docs/DECISIONS.md). The Link renders as `display: contents` so it's
// transparent to the <li>'s own flex layout and hover effects: the visible
// content is still directly the li's children, just wrapped in something
// clickable.
export function VisualPreviewCard({ visual, category }: VisualPreviewCardProps) {
  const { theme } = useTheme()
  return (
    <li className="border-line group bg-paper relative flex flex-col overflow-hidden rounded-lg border text-left transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.15] hover:shadow-xl">
      <Link to={`/v/${visual.slug}`} className="contents">
        <div className="bg-surface border-line flex aspect-square items-center justify-center overflow-hidden border-b p-2 transition-all duration-200 group-hover:p-0">
          <VisualThumbnail visual={visual} category={category} theme={theme} />
        </div>
        <div className="min-w-0 p-2">
          <p className="truncate font-mono text-xs">{visual.title}</p>
          <p className="text-ink-muted mt-1 line-clamp-2 text-[11px]">{visual.summaryMd}</p>
        </div>
      </Link>
    </li>
  )
}
