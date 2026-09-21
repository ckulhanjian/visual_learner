import { useEffect, useRef, useState } from 'react'
import type { ChartConfiguration } from 'chart.js'
import type { Category } from '../domain/Category'
import type { VisualCard } from '../domain/Visual'
import { buildDocument } from '../renderers/sandboxedDocument'
import { toSvgDataUri } from '../renderers/svgDataUri'
import type { Theme } from '../theme/useTheme'
import { CategoryAsciiArt } from './CategoryAsciiArt'

const SANDBOXED_KINDS = new Set(['d3', 'html', 'p5'])
// How long to wait for a sandboxed preview iframe to finish loading at all
// before giving up on it — separate from the error-message fallback below,
// which can fire immediately once the frame actually reports a problem.
const IFRAME_LOAD_TIMEOUT_MS = 4000

interface ChartThumbnailProps {
  source: string
  onFail: () => void
}

// A tiny live Chart.js instance, not a screenshot — reuses the same
// lazy dynamic import as renderers/chartjs.tsx so a page with no chartjs
// cards never downloads the library. Legend and animation are off by
// default (there's no room for a legend in a card-sized box, and a
// perpetually-animating chart in a grid of a dozen cards would be more
// distracting than informative) unless the visual's own config asks for
// them explicitly.
function ChartThumbnail({ source, onFail }: ChartThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let chart: import('chart.js').Chart | undefined
    let cancelled = false
    try {
      const parsed = JSON.parse(source) as ChartConfiguration
      const config: ChartConfiguration = {
        ...parsed,
        options: { maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, ...parsed.options },
      }
      import('chart.js/auto')
        .then(({ default: Chart }) => {
          if (cancelled || !canvasRef.current) return
          try {
            chart = new Chart(canvasRef.current, config)
          } catch {
            onFail()
          }
        })
        .catch(() => onFail())
    } catch {
      onFail()
    }
    return () => {
      cancelled = true
      chart?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  return <canvas ref={canvasRef} className="h-full w-full p-2" />
}

interface SandboxedThumbnailProps {
  kind: string
  source: string
  onFail: () => void
}

// Lazy-mounted (IntersectionObserver) so a category page with many
// d3/p5/html visuals doesn't load a CDN script and spin up a sandboxed
// iframe for every one of them the instant the page renders — only tiles
// that actually scroll near the viewport do. Failure is reported by the
// iframe itself via postMessage (see PREVIEW_ERROR_SCRIPT in
// renderers/sandboxedIframe.tsx) since a cross-origin sandboxed iframe
// (CLAUDE.md security invariant #1 — never `allow-same-origin`) can't be
// inspected from here directly; a load that never completes at all (no
// error reported, but no `onLoad` either) times out to the same fallback.
function SandboxedThumbnail({ kind, source, onFail }: SandboxedThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const loadedRef = useRef(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data as { achkPreview?: boolean; ok?: boolean } | undefined
      if (data?.achkPreview && data.ok === false) onFail()
    }
    window.addEventListener('message', handleMessage)
    const timeout = window.setTimeout(() => {
      if (!loadedRef.current) onFail()
    }, IFRAME_LOAD_TIMEOUT_MS)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  return (
    <div ref={containerRef} className="h-full w-full">
      {inView && (
        <iframe
          ref={iframeRef}
          title="preview"
          srcDoc={buildDocument(kind, source, { reportErrors: true })}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
          style={{ pointerEvents: 'none' }}
          onLoad={() => {
            loadedRef.current = true
          }}
        />
      )}
    </div>
  )
}

interface VisualThumbnailProps {
  visual: VisualCard
  category: Category
  theme: Theme
}

// The grid tile's "what goes in the box" — a best-effort live preview of
// the visual itself, not its kind name as plain text. Falls back to the
// category's own ASCII cover (docs/DECISIONS.md) when there's nothing
// card-sized to try (source too big to have been sent — see
// THUMBNAIL_MAX_BYTES on the backend — or `vega`, which has no renderer
// yet) or the attempt itself fails: a bad image, invalid chart JSON, or a
// runtime error inside a sandboxed d3/html/p5 preview. One component so
// VisualPreviewCard stays about the card's chrome, not per-kind render
// logic.
export function VisualThumbnail({ visual, category, theme }: VisualThumbnailProps) {
  const [failed, setFailed] = useState(false)
  const fail = () => setFailed(true)

  if (!failed) {
    if (visual.kind === 'svg' && visual.thumbnailSource) {
      return <img src={toSvgDataUri(visual.thumbnailSource)} alt="" className="h-full w-full object-contain" onError={fail} />
    }
    if (visual.kind === 'image' && visual.assetPath) {
      return <img src={visual.assetPath} alt="" className="h-full w-full object-cover" onError={fail} />
    }
    if (visual.kind === 'chartjs' && visual.thumbnailSource) {
      return <ChartThumbnail source={visual.thumbnailSource} onFail={fail} />
    }
    if (visual.needsSandbox && SANDBOXED_KINDS.has(visual.kind) && visual.thumbnailSource) {
      return <SandboxedThumbnail kind={visual.kind} source={visual.thumbnailSource} onFail={fail} />
    }
  }

  return (
    <div aria-hidden="true" className="flex h-full w-full items-center justify-center opacity-60">
      <CategoryAsciiArt category={category} theme={theme} animation="pulse" fontSizeClassName="text-[6px]" />
    </div>
  )
}
