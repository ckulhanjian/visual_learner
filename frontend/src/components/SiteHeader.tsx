import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
}

// Shared by every page: the logo (links home), the category hover
// dropdown (fetches its own `categories` data, since it's the only thing
// here that needs it), and the theme toggle. Pulled out of Home.tsx once a
// second page needed the identical header rather than a copy of it.
export function SiteHeader({ theme, onToggleTheme, activeCategoryName }: SiteHeaderProps) {
  const [categoriesState, setCategoriesState] = useState<LoadState<Category[]>>({ status: 'loading' })

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

  return (
    <header className="border-line flex items-center justify-between border-b px-6 py-5">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-mono text-sm tracking-[0.2em] uppercase">
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
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}
