import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/categories'
import { CategoryBubbleChart } from '../components/CategoryBubbleChart'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import type { Category } from '../domain/Category'
import type { LoadState } from '../domain/LoadState'
import { useTheme } from '../theme/useTheme'

// `/categories` — every category to pick from, as its own page rather than
// a header dropdown (docs/DECISIONS.md): the bubble chart needed room a
// popover couldn't give it.
export function CategoriesPage() {
  const { theme, toggleTheme } = useTheme()
  const [state, setState] = useState<LoadState<Category[]>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((categories) => {
        if (!cancelled) setState({ status: 'ready', data: categories })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        <h1 className="font-body mb-10 text-center text-3xl italic md:text-4xl">Categories</h1>

        {state.status === 'loading' && <p className="text-ink-muted text-center font-mono text-xs">Loading…</p>}
        {state.status === 'error' && (
          <p className="text-ink-muted text-center font-mono text-xs">Couldn't load categories: {state.message}</p>
        )}
        {state.status === 'ready' && <CategoryBubbleChart categories={state.data} />}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}
