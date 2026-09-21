import { useEffect, useMemo, useRef } from 'react'
import type { ChartConfiguration } from 'chart.js'

interface ChartJsRendererProps {
  source: string
}

// Chart.js renders in-page, not sandboxed — data-bearing, not code-bearing
// (docs/ARCHITECTURE.md §4): `source` is a JSON config, never executed as
// script. Lazy-loaded via dynamic import so a page with no chartjs-kind
// visual on it never downloads the library — docs/DECISIONS.md §2 committed
// to this before the renderer itself existed to honor it.
export function ChartJsRenderer({ source }: ChartJsRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Parsed during render, not inside the effect — the effect below only
  // needs to run the actual side effect (instantiating a Chart against the
  // canvas), not decide whether `source` was valid JSON.
  const { config, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(source) as ChartConfiguration
      // maintainAspectRatio: false unless the visual's own config overrides
      // it — otherwise Chart.js sizes the canvas off its own default aspect
      // ratio instead of filling the stage box VisualPage already gives it.
      const withDefaults: ChartConfiguration = { ...parsed, options: { maintainAspectRatio: false, ...parsed.options } }
      return { config: withDefaults, error: null as string | null }
    } catch {
      return { config: null, error: 'Invalid JSON in source.' }
    }
  }, [source])

  useEffect(() => {
    if (!config) return
    let chart: import('chart.js').Chart | undefined
    let cancelled = false
    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return
      chart = new Chart(canvasRef.current, config)
    })

    return () => {
      cancelled = true
      chart?.destroy()
    }
  }, [config])

  if (error) {
    return (
      <p className="text-ink-muted flex h-full w-full items-center justify-center font-mono text-xs uppercase">{error}</p>
    )
  }

  return (
    <div className="h-full w-full p-4">
      <canvas ref={canvasRef} />
    </div>
  )
}
