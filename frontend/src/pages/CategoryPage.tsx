import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchCategoryDetail, type CategoryDetail } from '../api/categories'
import { ApiError } from '../api/client'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { VisualPreviewCard } from '../components/VisualPreviewCard'
import type { LoadState } from '../domain/LoadState'
import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

interface CategoryPageContentProps {
  slug: string
}

// `key={slug}` in the wrapper below forces a fresh mount per slug, so this
// never has to reset its own state mid-effect for a slug that changes under
// it — every mount starts at "loading" for its own slug, once.
function CategoryPageContent({ slug }: CategoryPageContentProps) {
  const { theme, toggleTheme } = useTheme()
  const [state, setState] = useState<LoadState<CategoryDetail>>({ status: 'loading' })
  // A missing category (bad/stale slug) reads as "not found," not as a
  // generic error — separate from `state` since LoadState's error variant
  // only carries a message string, and this needs the original status code.
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCategoryDetail(slug)
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        {state.status === 'loading' && <p className="text-ink-muted font-mono text-xs">Loading…</p>}

        {state.status === 'error' && (
          <div className="mx-auto max-w-xl space-y-2 text-center">
            <p className="font-body text-2xl italic">{notFound ? 'Category not found.' : 'Something went wrong.'}</p>
            <p className="text-ink-muted font-mono text-xs">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && (
          <div className="mx-auto max-w-5xl">
            <div className="max-w-xl space-y-2">
              <h1
                className="font-body text-3xl italic md:text-4xl"
                style={{ color: displayColor(state.data.category.color, theme) }}
              >
                {state.data.category.name}
              </h1>
              {state.data.category.blurb && <p className="text-ink-muted">{state.data.category.blurb}</p>}
            </div>

            <ul className="m-0 mt-10 grid grid-cols-2 gap-4 p-0 sm:grid-cols-3">
              {state.data.visuals.length === 0 ? (
                <li className="text-ink-muted col-span-full font-mono text-xs uppercase">
                  No published visuals yet.
                </li>
              ) : (
                state.data.visuals.map((visual) => <VisualPreviewCard key={visual.slug} visual={visual} />)
              )}
            </ul>
          </div>
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}

// `/c/:slug` — see docs/ARCHITECTURE.md §6. Every published visual in the
// category, not the home page's top-3 preview; GET /categories/:slug
// returns exactly that in one request, category metadata and all.
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return null
  return <CategoryPageContent key={slug} slug={slug} />
}
