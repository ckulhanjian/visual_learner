import { useLayoutEffect, useRef, useState } from 'react'
import type { VisualCard } from '../domain/Visual'

interface VisualPreviewCardProps {
  visual: VisualCard
}

// A standalone SVG document — which is what an <img src="data:..."> loads —
// needs its own xmlns declaration. SVG inlined directly into an HTML page
// doesn't, since the HTML parser supplies the namespace; a data URI is
// parsed as its own document, and silently fails to decode without one.
// Hand-typed or pasted SVG snippets routinely omit it, so this can't just be
// fixed in seed data — it has to hold for anything a visitor submits too.
// TODO: move this alongside the real `svg` renderer once src/renderers/
// exists, since it will need the same fix.
function toSvgDataUri(source: string): string {
  const withNamespace = source.includes('xmlns=')
    ? source
    : source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return `data:image/svg+xml,${encodeURIComponent(withNamespace)}`
}

export function VisualPreviewCard({ visual }: VisualPreviewCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const titleRef = useRef<HTMLParagraphElement | null>(null)
  const [overflowPx, setOverflowPx] = useState(0)

  // Only a title too long for its box needs to move at all — measured after
  // layout since it depends on the rendered width, not the string length.
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    setOverflowPx(Math.max(0, el.scrollWidth - el.clientWidth))
  }, [visual.title])

  return (
    <li
      className="border-line group bg-paper relative flex flex-col overflow-hidden rounded-lg border text-left transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.15] hover:shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-surface border-line flex aspect-square items-center justify-center overflow-hidden border-b">
        {visual.thumbnailSource ? (
          // Rendered via <img>, not dangerouslySetInnerHTML: a data URI loaded
          // as an image is never script-executable, unlike inlining SVG
          // markup straight into the DOM (which is what the eventual `svg`
          // renderer will need real sanitization for — see docs/ARCHITECTURE.md §4).
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
        {/* No `truncate`/ellipsis: the full title exists in the DOM (so
            scrollWidth reflects it) and is meant to become readable by
            scrolling on hover, not cut off. Speed scales with distance so a
            long title and a short one feel like the same pace. */}
        <p
          ref={titleRef}
          className="w-full overflow-hidden font-mono text-xs whitespace-nowrap ease-linear"
          style={{
            transform: isHovered ? `translateX(-${overflowPx}px)` : 'translateX(0)',
            transitionProperty: 'transform',
            transitionDuration: `${Math.max(0.5, overflowPx / 30)}s`,
          }}
        >
          {visual.title}
        </p>
        <p className="text-ink-muted mt-1 line-clamp-2 text-[11px]">{visual.summaryMd}</p>
      </div>
    </li>
  )
}
