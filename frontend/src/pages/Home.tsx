import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories } from '../api/categories'
import { fetchVisualsByCategory } from '../api/visuals'
import { CategorySpinner } from '../components/CategorySpinner'
import { ExpandCell } from '../components/ExpandCell'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { VisualPreviewCard } from '../components/VisualPreviewCard'
import { HOME_CATEGORY, type Category } from '../domain/Category'
import type { LoadState } from '../domain/LoadState'
import type { VisualCard } from '../domain/Visual'
import { useIsDesktopWidth } from '../hooks/useIsDesktopWidth'
import { useTheme } from '../theme/useTheme'

const PREVIEW_COUNT = 3
// How much further down both hero positions sit versus their "natural"
// spot (dead top for the pinned state, dead center for the home state) —
// a flat request ("move it lower"), applied the same way to both rather
// than tuned separately for each.
const VERTICAL_NUDGE_FRACTION = 0.1

export function Home() {
  const { theme, toggleTheme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoriesState, setCategoriesState] = useState<LoadState<Category[]>>({ status: 'loading' })
  const [activeCategory, setActiveCategoryState] = useState<Category>(HOME_CATEGORY)
  const [previewState, setPreviewState] = useState<LoadState<VisualCard[]>>({ status: 'loading' })
  const isHome = activeCategory.slug === HOME_CATEGORY.slug
  const isDesktopWidth = useIsDesktopWidth()

  const mainRef = useRef<HTMLElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const [contentOffset, setContentOffset] = useState(0)

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
        // No auto-selecting categories[0] here — the page starts on
        // HOME_CATEGORY (no grid, hero centered) until the visitor
        // actually scrolls the spinner, per docs/DECISIONS.md — *unless*
        // arriving via a category page's "back to home" link, which
        // carries the category it came from as ?category=slug so the
        // spinner lands back where the visitor left it, not at Home.
        const returningSlug = searchParams.get('category')
        const returningCategory = categories.find((category) => category.slug === returningSlug)
        if (returningCategory) {
          setActiveCategory(returningCategory)
          setSearchParams({}, { replace: true })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setCategoriesState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
    // Deliberately empty: this reads the URL's initial ?category= once, on
    // the mount that follows arriving from a category page — it must not
    // re-run and re-apply that param on every subsequent searchParams
    // change this same effect causes via setSearchParams above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isHome) return
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
  }, [activeCategory, isHome])

  // Two positions for the hero, not one: dead-centered in the workspace
  // while HOME_CATEGORY is active (nothing scrolled yet), pinned near the
  // top once a real category is — both measured against `main`'s own
  // content-box height, which is stable regardless of whether the grid
  // below is showing. Not the workspace column's height: `align-items`
  // computes to `normal` here (Tailwind's preflight doesn't force
  // `stretch`), so a plain `h-full` on a flex-row child doesn't actually
  // pick up the row's cross size — measuring `main` directly sidesteps
  // that rather than fighting it.
  //
  // Desktop-only (`isDesktopWidth`): this is a `transform`, which shifts
  // what's painted without changing layout flow. At `lg`, the spinner is a
  // separate flex-row column next to this one, so nothing else cares where
  // this content actually ends up. Below `lg`, CategorySpinner's tap-row
  // fallback sits directly after this column in normal flow — shifting
  // this content down without also reserving that space would paint it
  // over the tap-row instead of leaving a gap before it.
  useLayoutEffect(() => {
    if (!isDesktopWidth) return
    function measure() {
      const mainEl = mainRef.current
      const heroHeight = heroRef.current?.offsetHeight ?? 0
      if (!mainEl) return
      const style = getComputedStyle(mainEl)
      const paddingTop = parseFloat(style.paddingTop) || 0
      const paddingBottom = parseFloat(style.paddingBottom) || 0
      const availableHeight = mainEl.clientHeight - paddingTop - paddingBottom
      const nudge = availableHeight * VERTICAL_NUDGE_FRACTION
      setContentOffset(isHome ? (availableHeight - heroHeight) / 2 + nudge : nudge)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isHome, isDesktopWidth])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main ref={mainRef} className="flex flex-1 flex-col gap-10 px-6 py-16 lg:flex-row lg:gap-6">
        <div className="flex flex-1 flex-col gap-10">
          <div
            className="flex flex-col gap-10"
            style={{
              transform: `translateY(${isDesktopWidth ? contentOffset : 0}px)`,
              transition: 'transform 500ms ease',
            }}
          >
            <div ref={heroRef} className="mx-auto max-w-xl space-y-3 text-center">
              <h1 className="font-body text-3xl italic md:text-4xl">The Art of Visualization</h1>
              <p className="text-ink-muted">
                Physics, signals and systems, programming, circuits — written by hand, generated,
                or uploaded, each with the math and the story behind it.
              </p>
            </div>

            {!isHome && (
              <div className="ml-[20%] w-4/5 text-left">
                {previewState.status === 'loading' && <p className="text-ink-muted font-mono text-xs">Loading…</p>}
                {previewState.status === 'error' && (
                  <p className="font-mono text-xs text-red-700 dark:text-red-400">{previewState.message}</p>
                )}
                {previewState.status === 'ready' && (
                  <ul className="m-0 grid grid-cols-2 gap-4 p-0 sm:grid-cols-4">
                    {Array.from({ length: PREVIEW_COUNT }, (_, i) => previewState.data[i] ?? null).map((visual, i) =>
                      visual ? (
                        <VisualPreviewCard key={visual.slug} visual={visual} />
                      ) : (
                        // Mirrors VisualPreviewCard's own structure (an
                        // aspect-square area plus a title/summary text
                        // block below, the latter invisible rather than
                        // absent) so this cell's natural height always
                        // matches a real card's — not just its image
                        // portion. Without the text block, a row mixing
                        // this with a real (taller) card left it short,
                        // stranded above where ExpandCell's bottom-aligned
                        // text landed in that same row.
                        <li
                          key={`empty-${i}`}
                          className="border-line text-ink-muted flex flex-col overflow-hidden rounded-lg border border-dashed"
                        >
                          <div className="flex aspect-square items-center justify-center font-mono text-[10px] uppercase">
                            Empty
                          </div>
                          <div className="min-w-0 p-2">
                            <p className="invisible font-mono text-xs">Placeholder</p>
                            <p className="invisible mt-1 line-clamp-2 text-[11px]">
                              Reserves the same two-line height a real summary would take.
                            </p>
                          </div>
                        </li>
                      ),
                    )}
                    <ExpandCell categorySlug={activeCategory.slug} categoryColor={activeCategory.color} />
                  </ul>
                )}
              </div>
            )}
          </div>

          {categoriesState.status === 'error' && (
            <p className="text-ink-muted font-mono text-xs">
              Couldn't load categories: {categoriesState.message}
            </p>
          )}
        </div>

        {categoriesState.status === 'ready' && (
          <CategorySpinner
            categories={categoriesState.data}
            activeSlug={activeCategory.slug}
            onActiveChange={setActiveCategory}
          />
        )}
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}
