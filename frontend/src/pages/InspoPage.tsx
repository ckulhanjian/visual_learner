import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { useTheme } from '../theme/useTheme'

const PINTEREST_SCRIPT_SRC = '//assets.pinterest.com/js/pinit.js'

function loadPinterestScript(): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${PINTEREST_SCRIPT_SRC}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = PINTEREST_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

interface PinterestBoardWidgetProps {
  boardUrl: string
  width: number
}

// Pinterest's own widget script scans the DOM for `<a data-pin-do="embedBoard">`
// and replaces it with an iframe sized off `data-pin-board-width` — a DOM
// mutation React doesn't know about. Building that anchor with plain DOM
// calls into a ref-owned, React-children-free container (rather than JSX)
// means React never tries to reconcile a node Pinterest has since replaced;
// re-running this effect when `width` changes rebuilds the anchor at the
// new size and asks Pinterest to build it again.
function PinterestBoardWidget({ boardUrl, width }: PinterestBoardWidgetProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || width <= 0) return
    let cancelled = false

    mount.innerHTML = ''
    const anchor = document.createElement('a')
    anchor.setAttribute('data-pin-do', 'embedBoard')
    anchor.setAttribute('data-pin-board-width', String(Math.round(width)))
    anchor.setAttribute('data-pin-scale-height', '240')
    anchor.setAttribute('data-pin-scale-width', '80')
    anchor.href = boardUrl
    mount.appendChild(anchor)

    loadPinterestScript().then(() => {
      if (cancelled) return
      // Pinterest's own script already auto-scans once on load; calling
      // this again is what makes it re-scan on every subsequent rebuild
      // (a new board URL, a resize) rather than only ever building once.
      const pinUtils = (window as unknown as { PinUtils?: { build: () => void } }).PinUtils
      pinUtils?.build()
    })

    return () => {
      cancelled = true
    }
  }, [boardUrl, width])

  return <div ref={mountRef} />
}

// `/inspo` — a Pinterest board of sample visualizations, embedded with
// Pinterest's own widget script rather than an iframe. Not a design
// preference: Pinterest's own board pages send frame-busting headers that
// block a plain `<iframe>` outright (confirmed directly, not assumed — see
// docs/DECISIONS.md), and the widget is the mechanism they provide instead.
// First-party, curated content the site owner points at, not pasted
// third-party code, so CLAUDE.md's code-bearing-kind sandbox rule doesn't
// apply here.
export function InspoPage() {
  const { theme, toggleTheme } = useTheme()
  // No default board baked in — never guess a URL that isn't the site
  // owner's own. Set in frontend/.env as VITE_PINTEREST_BOARD_URL.
  const boardUrl = import.meta.env.VITE_PINTEREST_BOARD_URL as string | undefined
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    function measure() {
      if (!element) return
      // Rounded to the nearest 20px so an ordinary window resize doesn't
      // rebuild the widget's own iframe on every single pixel.
      setWidth(Math.round(element.clientWidth / 20) * 20)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        <h1 className="font-body mb-10 text-center text-3xl italic md:text-4xl">Inspo</h1>

        {boardUrl ? (
          // Full width of the content area, not the earlier `max-w-3xl` cap
          // — feedback asked for the board to match the width of the page.
          <div ref={containerRef} className="w-full">
            {width > 0 && <PinterestBoardWidget boardUrl={boardUrl} width={width} />}
          </div>
        ) : (
          <p className="text-ink-muted mx-auto max-w-md text-center font-mono text-xs">
            No Pinterest board configured yet — set <code className="text-ink">VITE_PINTEREST_BOARD_URL</code> in{' '}
            <code className="text-ink">frontend/.env</code> to the board's URL.
          </p>
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}
