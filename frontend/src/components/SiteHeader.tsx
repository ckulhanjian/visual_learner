import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCategoryTopics } from '../api/topics'
import type { LoadState } from '../domain/LoadState'
import type { CategoryTopics } from '../domain/Topic'
import type { Theme } from '../theme/useTheme'
import { CategoryTreeNav } from './CategoryTreeNav'
import { ThemeToggle } from './ThemeToggle'

interface SiteHeaderProps {
  theme: Theme
  onToggleTheme: () => void
}

// Shared by every page: the logo (links home), the category tree dropdown
// (fetches its own `topics` data, since it's the only thing here that needs
// it), and the theme toggle. Pulled out of Home.tsx once a second page
// needed the identical header rather than a copy of it.
export function SiteHeader({ theme, onToggleTheme }: SiteHeaderProps) {
  const [topicsState, setTopicsState] = useState<LoadState<CategoryTopics[]>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchCategoryTopics()
      .then((topics) => {
        if (!cancelled) setTopicsState({ status: 'ready', data: topics })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setTopicsState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <header className="border-line flex items-center justify-between border-b px-6 py-5">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-mono text-sm tracking-[0.2em] uppercase">
          Atlas
        </Link>
        {topicsState.status === 'ready' && <CategoryTreeNav data={topicsState.data} />}
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}
