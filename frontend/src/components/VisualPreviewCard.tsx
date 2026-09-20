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
  return (
    <li className="border-line group bg-paper relative flex flex-col overflow-hidden rounded-lg border text-left transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.15] hover:shadow-xl">
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
        <p className="truncate font-mono text-xs">{visual.title}</p>
        <p className="text-ink-muted mt-1 line-clamp-2 text-[11px]">{visual.summaryMd}</p>
      </div>
    </li>
  )
}
