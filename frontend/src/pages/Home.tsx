import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/categories'
import { fetchCategoryTopics } from '../api/topics'
import { fetchVisualsByCategory } from '../api/visuals'
import { CategorySpinner } from '../components/CategorySpinner'
import { CategoryTreeNav } from '../components/CategoryTreeNav'
import { ExpandCell } from '../components/ExpandCell'
import { SiteFooter } from '../components/SiteFooter'
import { ThemeToggle } from '../components/ThemeToggle'
import { VisualPreviewCard } from '../components/VisualPreviewCard'
import type { Category } from '../domain/Category'
import type { CategoryTopics } from '../domain/Topic'
import type { VisualCard } from '../domain/Visual'
import { useTheme } from '../theme/useTheme'

const PREVIEW_COUNT = 3

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

export function Home() {
  const { theme, toggleTheme } = useTheme()
  const [categoriesState, setCategoriesState] = useState<LoadState<Category[]>>({ status: 'loading' })
  const [topicsState, setTopicsState] = useState<LoadState<CategoryTopics[]>>({ status: 'loading' })
  const [activeCategory, setActiveCategoryState] = useState<Category | null>(null)
  const [previewState, setPreviewState] = useState<LoadState<VisualCard[]>>({ status: 'loading' })

  // Reset the preview to "loading" at the moment a category is chosen, not
  // inside the fetch effect below — that's the event that actually causes
  // the change, so that's where the state reset belongs.
  function setActiveCategory(category: Category) {
    setActiveCategoryState(category)
    setPreviewState({ status: 'loading' })
  }

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((categories) => {
        if (cancelled) return
        setCategoriesState({ status: 'ready', data: categories })
        // This effect has an empty dependency array, so it runs exactly once
        // on mount — activeCategory is guaranteed still null here.
        if (categories.length > 0) setActiveCategory(categories[0])
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

  useEffect(() => {
    if (!activeCategory) return
    let cancelled = false
    // No setPreviewState({ status: 'loading' }) here — setActiveCategory
    // already did that at the point of selection, before this effect runs.
    fetchVisualsByCategory(activeCategory.slug)
      .then((visuals) => {
        if (!cancelled) setPreviewState({ status: 'ready', data: visuals.slice(0, PREVIEW_COUNT) })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setPreviewState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [activeCategory])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-line flex items-center justify-between border-b px-6 py-5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm tracking-[0.2em] uppercase">Atlas</span>
          {topicsState.status === 'ready' && <CategoryTreeNav data={topicsState.data} />}
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="relative flex flex-1 flex-col gap-10 px-6 py-16">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <h1 className="font-body text-3xl italic md:text-4xl">A personal atlas of visualizations</h1>
          <p className="text-ink-muted">
            Physics, signals and systems, programming, circuits — written by hand, generated,
            or uploaded, each with the math and the story behind it.
          </p>
        </div>

        <div className="mx-auto w-full max-w-xl text-left">
          {previewState.status === 'loading' && <p className="text-ink-muted font-mono text-xs">Loading…</p>}
          {previewState.status === 'error' && (
            <p className="font-mono text-xs text-red-700 dark:text-red-400">{previewState.message}</p>
          )}
          {previewState.status === 'ready' && activeCategory && (
            <ul className="m-0 grid grid-cols-2 gap-3 p-0 sm:grid-cols-4">
              {Array.from({ length: PREVIEW_COUNT }, (_, i) => previewState.data[i] ?? null).map((visual, i) =>
                visual ? (
                  <VisualPreviewCard key={visual.slug} visual={visual} />
                ) : (
                  <li
                    key={`empty-${i}`}
                    className="border-line text-ink-muted flex aspect-square items-center justify-center rounded-lg border border-dashed font-mono text-[10px] uppercase"
                  >
                    Empty
                  </li>
                ),
              )}
              <ExpandCell categoryColor={activeCategory.color} />
            </ul>
          )}
        </div>

        {categoriesState.status === 'ready' && (
          <CategorySpinner
            categories={categoriesState.data}
            activeSlug={activeCategory?.slug ?? null}
            onActiveChange={setActiveCategory}
          />
        )}
        {categoriesState.status === 'error' && (
          <p className="text-ink-muted absolute right-6 bottom-6 font-mono text-xs">
            Couldn't load categories: {categoriesState.message}
          </p>
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}
