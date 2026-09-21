import { Link } from 'react-router-dom'
import type { Theme } from '../theme/useTheme'
import { ThemeToggle } from './ThemeToggle'

interface SiteHeaderProps {
  theme: Theme
  onToggleTheme: () => void
  // Set only by CategoryPage, once its category has loaded — swaps the nav
  // link's label from "Categories" to "Category: <name>" while a category
  // page is open, per docs/DECISIONS.md.
  activeCategoryName?: string
}

// Shared by every page: the logo (links home), a link to the categories
// page, and the theme toggle. Pulled out of Home.tsx once a second page
// needed the identical header rather than a copy of it.
export function SiteHeader({ theme, onToggleTheme, activeCategoryName }: SiteHeaderProps) {
  return (
    <header className="border-line flex items-center justify-between border-b px-6 py-5">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-mono text-sm tracking-[0.2em] uppercase">
          Achk
        </Link>
        <Link
          to="/categories"
          className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
        >
          {activeCategoryName ? `Category: ${activeCategoryName}` : 'Categories'}
        </Link>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}
