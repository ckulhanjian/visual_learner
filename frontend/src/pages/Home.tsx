import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/categories'
import { ArcNav } from '../components/ArcNav'
import { ConnectionCheck } from '../components/ConnectionCheck'
import { ThemeToggle } from '../components/ThemeToggle'
import type { Category } from '../domain/Category'
import { useTheme } from '../theme/useTheme'

type CategoriesState =
  | { status: 'loading' }
  | { status: 'ready'; categories: Category[] }
  | { status: 'error'; message: string }

export function Home() {
  const { theme, toggleTheme } = useTheme()
  const [categoriesState, setCategoriesState] = useState<CategoriesState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((categories) => {
        if (!cancelled) setCategoriesState({ status: 'ready', categories })
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
    <div className="flex min-h-screen flex-col">
      <header className="border-line flex items-center justify-between border-b px-6 py-5">
        <span className="font-mono text-sm tracking-[0.2em] uppercase">Atlas</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="max-w-xl space-y-3">
          <h1 className="font-mono text-2xl tracking-tight md:text-3xl">A personal atlas of visualizations</h1>
          <p className="text-ink-muted">
            Physics, signals and systems, programming, circuits — written by hand, generated,
            or uploaded, each with the math and the story behind it.
          </p>
        </div>

        {categoriesState.status === 'ready' && <ArcNav categories={categoriesState.categories} />}
        {categoriesState.status === 'loading' && (
          <p className="text-ink-muted font-mono text-xs">Loading categories…</p>
        )}
        {categoriesState.status === 'error' && (
          <p className="font-mono text-xs text-red-700 dark:text-red-400">
            Couldn't load categories: {categoriesState.message}
          </p>
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <ConnectionCheck />
      </footer>
    </div>
  )
}
