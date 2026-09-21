import { useEffect } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { useTheme } from '../theme/useTheme'

const PINTEREST_SCRIPT_SRC = 'https://assets.pinterest.com/js/pinit.js'

// Loads Pinterest's own widget script once per page (checks for an
// existing <script src> before adding another) and, if it's already
// loaded, asks it to scan the DOM again. Pinterest's script only
// auto-scans once, on its own load — without the explicit re-scan,
// arriving here by client-side navigation after the script already ran on
// an earlier visit would leave the embed anchor as plain unbuilt text.
function usePinterestWidget(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const existing = document.querySelector(`script[src="${PINTEREST_SCRIPT_SRC}"]`)
    if (!existing) {
      const script = document.createElement('script')
      script.src = PINTEREST_SCRIPT_SRC
      script.async = true
      document.body.appendChild(script)
      return
    }
    const pinUtils = (window as unknown as { PinUtils?: { build: () => void } }).PinUtils
    pinUtils?.build()
  }, [enabled])
}

// `/inspo` — a Pinterest board of sample visualizations, embedded with
// Pinterest's own widget script rather than an iframe (Pinterest doesn't
// offer a sandboxed embed for boards). That's fine here: this is
// first-party, curated content the site owner points at, not pasted
// third-party code — the code-bearing-kind sandbox rule (CLAUDE.md) is
// about the latter, not this.
export function InspoPage() {
  const { theme, toggleTheme } = useTheme()
  // No default board baked in — never guess a URL that isn't the site
  // owner's own. Set in frontend/.env as VITE_PINTEREST_BOARD_URL.
  const boardUrl = import.meta.env.VITE_PINTEREST_BOARD_URL as string | undefined
  usePinterestWidget(Boolean(boardUrl))

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        <h1 className="font-body mb-10 text-center text-3xl italic md:text-4xl">Inspo</h1>

        {boardUrl ? (
          <div className="mx-auto flex max-w-3xl justify-center">
            <a
              data-pin-do="embedBoard"
              data-pin-board-width="900"
              data-pin-scale-height="240"
              data-pin-scale-width="80"
              href={boardUrl}
            >
              {boardUrl}
            </a>
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
