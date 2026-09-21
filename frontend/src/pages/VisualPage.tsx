import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchVisualDetail } from '../api/visuals'
import { ApiError } from '../api/client'
import { MarkdownBody } from '../components/MarkdownBody'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import type { VisualDetail } from '../domain/Visual'
import type { LoadState } from '../domain/LoadState'
import { VisualRenderer } from '../renderers/registry'
import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

// Mirrors tokens.css's own `--color-paper` values — a visual matted for a
// specific theme needs the literal color, not the page's current CSS
// variable, since the whole point is that it looks the same regardless of
// what the visitor has the page set to. Kept in sync by hand; there's only
// one other place these two hexes are declared.
const LIGHT_MAT = '#f6f1e4'
const DARK_MAT = '#1c1c1c'

interface VisualPageContentProps {
  slug: string
}

function formatCreatedOn(createdOn: string | null): string | null {
  if (!createdOn) return null
  const date = new Date(`${createdOn}T00:00:00`)
  if (Number.isNaN(date.getTime())) return createdOn
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// `key={slug}` below forces a fresh mount per slug, same reasoning as
// CategoryPageContent: every mount starts at "loading" for its own slug,
// no mid-effect reset needed.
function VisualPageContent({ slug }: VisualPageContentProps) {
  const { theme, toggleTheme } = useTheme()
  const [state, setState] = useState<LoadState<VisualDetail>>({ status: 'loading' })
  const [notFound, setNotFound] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchVisualDetail(slug)
      .then((detail) => {
        if (!cancelled) setState({ status: 'ready', data: detail })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) setNotFound(true)
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // "Full screen" is this class flip, never the browser Fullscreen API
  // (CLAUDE.md) — it behaves inconsistently across browsers and traps
  // keyboard handling. Escape backs out of it the same way any other
  // overlay on this site does; body scroll is locked while it's up so the
  // page underneath doesn't scroll along with it.
  useEffect(() => {
    if (!expanded) return
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', handleKeydown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = previousOverflow
    }
  }, [expanded])

  const category = state.status === 'ready' ? state.data.category : undefined
  const mat =
    state.status === 'ready' && state.data.themeAffinity !== 'adaptive'
      ? state.data.themeAffinity === 'dark'
        ? DARK_MAT
        : LIGHT_MAT
      : undefined
  const createdOnLabel = state.status === 'ready' ? formatCreatedOn(state.data.createdOn) : null

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        {state.status === 'loading' && <p className="text-ink-muted font-mono text-xs">Loading…</p>}

        {state.status === 'error' && (
          <div className="mx-auto max-w-xl space-y-2 text-center">
            <p className="font-body text-2xl italic">{notFound ? 'Visual not found.' : 'Something went wrong.'}</p>
            <p className="text-ink-muted font-mono text-xs">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && category && (
          <div className="mx-auto max-w-4xl">
            <Link
              to={`/c/${category.slug}`}
              className="text-ink-muted hover:text-ink mb-2 block font-mono text-[11px] tracking-wide uppercase transition-colors"
            >
              &larr; {category.name}
            </Link>
            <h1 className="font-body mb-6 text-3xl italic md:text-4xl">{state.data.title}</h1>

            {/* The stage: a bounded box in normal flow, or the full
                viewport when expanded — same element, one class flip, not
                two different layouts. A non-adaptive theme_affinity mats
                it in its own fixed background either way, so a
                dark-designed visual never sits directly on a cream page
                (or vice versa). */}
            <div
              className={
                expanded
                  ? 'bg-paper fixed inset-0 z-50 flex items-center justify-center'
                  : 'border-line bg-paper relative aspect-video w-full overflow-hidden rounded-lg border'
              }
              style={{ backgroundColor: mat }}
            >
              <div className="h-full w-full">
                <VisualRenderer visual={state.data} />
              </div>
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="bg-surface border-line text-ink/70 hover:text-ink absolute top-2 right-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors"
              >
                {expanded ? 'Close' : 'Full screen'}
              </button>
            </div>

            <dl className="text-ink-muted mt-6 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-4">
              <div>
                <dt className="uppercase opacity-70">Attribution</dt>
                <dd className="text-ink mt-0.5">{state.data.attribution}</dd>
              </div>
              {createdOnLabel && (
                <div>
                  <dt className="uppercase opacity-70">Made</dt>
                  <dd className="text-ink mt-0.5">{createdOnLabel}</dd>
                </div>
              )}
              <div>
                <dt className="uppercase opacity-70">Context</dt>
                <dd className="text-ink mt-0.5">
                  {state.data.context}
                  {state.data.course ? ` · ${state.data.course}` : ''}
                </dd>
              </div>
              {state.data.tags.length > 0 && (
                <div>
                  <dt className="uppercase opacity-70">Tags</dt>
                  <dd className="text-ink mt-0.5">{state.data.tags.join(', ')}</dd>
                </div>
              )}
            </dl>

            {state.data.resources.length > 0 && (
              <ul className="m-0 mt-4 flex flex-wrap gap-3 p-0 font-mono text-xs">
                {state.data.resources.map((resource) => (
                  <li key={resource.id}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink/80 hover:text-ink underline-offset-2 hover:underline"
                      style={{ color: displayColor(category.color, theme) }}
                    >
                      {resource.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {state.data.notesMd && (
              <div className="mt-10">
                <MarkdownBody source={state.data.notesMd} theme={theme} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}

// `/v/:slug` — see docs/ARCHITECTURE.md §6. Full-bleed visual, expand
// toggle, metadata and notes below.
export function VisualPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return null
  return <VisualPageContent key={slug} slug={slug} />
}
