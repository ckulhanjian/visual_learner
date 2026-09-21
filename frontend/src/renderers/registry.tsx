import type { VisualDetail } from '../domain/Visual'
import { ImageRenderer } from './image'
import { SandboxedIframeRenderer } from './sandboxedIframe'
import { SvgRenderer } from './svg'

interface VisualRendererProps {
  visual: VisualDetail
}

// Code-bearing kinds all go through the same sandboxed iframe (see
// sandboxedIframe.tsx) — the discriminator here is just which ones need it.
const SANDBOXED_KINDS = new Set(['d3', 'html', 'p5'])

// The kind field is the discriminator on both ends (docs/ARCHITECTURE.md
// §4). Adding a kind means one new file in this directory and one branch
// here — VisualPage itself never inspects `kind`, per CLAUDE.md's "pages
// compose, they do not implement." `chartjs` and `vega` don't have a
// renderer yet (round one shipped svg/image/d3/html/p5's sandbox; Chart.js
// and Vega need their own library wired in — docs/DECISIONS.md), so they
// fall through to an honest placeholder instead of a blank box.
export function VisualRenderer({ visual }: VisualRendererProps) {
  if (visual.kind === 'svg') return <SvgRenderer source={visual.source} />
  if (visual.kind === 'image') return <ImageRenderer assetPath={visual.assetPath} title={visual.title} />
  if (SANDBOXED_KINDS.has(visual.kind)) {
    return <SandboxedIframeRenderer kind={visual.kind} source={visual.source} />
  }
  return (
    <div className="text-ink-muted flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-xs uppercase">
      <span>{visual.kind}</span>
      <span className="opacity-70">Renderer not built yet</span>
    </div>
  )
}
