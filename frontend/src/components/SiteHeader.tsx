import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchCategories } from '../api/categories'
import type { Category } from '../domain/Category'
import type { LoadState } from '../domain/LoadState'
import type { Theme } from '../theme/useTheme'
import { CategoryTreeNav } from './CategoryTreeNav'
import { ThemeToggle } from './ThemeToggle'

interface SiteHeaderProps {
  theme: Theme
  onToggleTheme: () => void
  // Set only by CategoryPage, once its category has loaded — swaps the nav
  // link's label from "Categories" to "Category: <name>" while a category
  // page is open, per docs/DECISIONS.md.
  activeCategoryName?: string
  // Set only by Home.tsx: clicking the logo while already on `/` needs to
  // reset the spinner to HOME_CATEGORY, which a same-path <Link> can't do
  // on its own (navigating to the page you're already on is a no-op — no
  // location change, no remount, nothing re-runs). Every other page leaves
  // this unset and gets plain Link navigation.
  onLogoClick?: () => void
}

// Shared by every page: the logo (links home), the category hover
// dropdown (fetches its own `categories` data, since it's the only thing
// here that needs it), and the theme toggle. Pulled out of Home.tsx once a
// second page needed the identical header rather than a copy of it.
export function SiteHeader({ theme, onToggleTheme, activeCategoryName, onLogoClick }: SiteHeaderProps) {
  const [categoriesState, setCategoriesState] = useState<LoadState<Category[]>>({ status: 'loading' })
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((categories) => {
        if (!cancelled) setCategoriesState({ status: 'ready', data: categories })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setCategoriesState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  // From a category page, the logo goes home *carrying that category*
  // (`/?category=:slug` — the same param Home.tsx already reads on mount
  // to land the spinner back where the visitor came from) rather than to
  // a bare, unselected home — replacing the dedicated "← Home" link that
  // used to do this. Derived from the URL, not a prop, so this needs no
  // wiring from CategoryPage at all.
  const categoryPageMatch = location.pathname.match(/^\/c\/([^/]+)/)
  const logoHref = categoryPageMatch ? `/?category=${categoryPageMatch[1]}` : '/'

  return (
    <header className="border-line flex items-center justify-between border-b px-6 py-5">
      <div className="flex items-center gap-4">
        <Link
          to={logoHref}
          onClick={
            onLogoClick
              ? (event) => {
                  event.preventDefault()
                  onLogoClick()
                }
              : undefined
          }
          className="font-body text-xl italic"
        >
          Achk
        </Link>
        {categoriesState.status === 'ready' ? (
          <CategoryTreeNav categories={categoriesState.data} activeCategoryName={activeCategoryName} />
        ) : (
          // While categories are loading (or failed to load), the dropdown
          // has nothing to show — a plain link to the categories page is
          // still a real, working destination either way.
          <Link
            to="/categories"
            className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
          >
            {activeCategoryName ? `Category: ${activeCategoryName}` : 'Categories'}
          </Link>
        )}
        <Link
          to="/inspo"
          className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
        >
          Inspo
        </Link>
        <Link
          to="/submit"
          className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
        >
          Submit
        </Link>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}
