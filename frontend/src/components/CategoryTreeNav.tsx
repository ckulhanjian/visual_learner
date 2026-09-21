import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVisualsByCategory } from '../api/visuals'
import type { Category } from '../domain/Category'
import type { VisualCard } from '../domain/Visual'
import { displayColor, pastelize } from '../theme/categoryColor'
import type { Theme } from '../theme/useTheme'
import { useTheme } from '../theme/useTheme'

interface CategoryTreeNavProps {
  categories: Category[]
  activeCategoryName?: string
}

const MIN_BUBBLE = 52
const MAX_BUBBLE = 96

// Diameter scales with how many published visuals a category has — the
// point of "bubbles," not a fixed grid of same-size circles. A category
// with none still gets MIN_BUBBLE, not zero: it's still a real, clickable
// category, just the smallest one on screen.
function bubbleSize(count: number, maxCount: number): number {
  if (maxCount === 0) return MIN_BUBBLE
  return MIN_BUBBLE + (count / maxCount) * (MAX_BUBBLE - MIN_BUBBLE)
}

interface CategoryBubbleProps {
  category: Category
  size: number
  isHovered: boolean
  onHover: () => void
  theme: Theme
}

// Grey, not the category's own color — Tailwind's `dark:` variant tracks
// `prefers-color-scheme`, but this app's dark mode is a manually toggled
// `data-theme` attribute (`useTheme.ts`), independent of OS preference; a
// `dark:` class here would silently never apply when they disagree. Same
// reason `displayColor`/`pastelize` take `theme` as a value instead.
function backdropColor(theme: Theme): string {
  return theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
}

function CategoryBubble({ category, size, isHovered, onHover, theme }: CategoryBubbleProps) {
  return (
    <Link
      to={`/c/${category.slug}`}
      onMouseEnter={onHover}
      className="relative flex shrink-0 items-center justify-center rounded-full text-center transition-transform hover:scale-105"
      style={{ width: size, height: size }}
    >
      {/* The "opaque grey circle behind it" hover cue — larger than the
          bubble itself and centered under it, not a background/ring on the
          bubble, so the pastel fill and border stay exactly as designed
          while hovered. */}
      <span
        aria-hidden="true"
        className="absolute rounded-full transition-opacity duration-150"
        style={{
          width: size + 16,
          height: size + 16,
          opacity: isHovered ? 1 : 0,
          backgroundColor: backdropColor(theme),
        }}
      />
      <span
        className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full border-2 px-1 leading-tight"
        style={{ borderColor: category.color, backgroundColor: pastelize(category.color) }}
      >
        <span className="font-mono text-[9px] font-bold break-words" style={{ color: category.color }}>
          {category.name}
        </span>
        <span className="font-mono text-[8px] opacity-70" style={{ color: category.color }}>
          {category.publishedCount}
        </span>
      </span>
    </Link>
  )
}

// The header's "Categories" dropdown: every category as a bubble sized by
// its published-visual count (docs/DECISIONS.md), and — hovering one, not
// clicking, since browsing shouldn't cost a click per category — that
// category's visuals listed on the right. Clicking a bubble is the actual
// navigation, to /c/:slug. Not the same job as CategorySpinner: this is
// direct lookup for someone who already knows what they want.
export function CategoryTreeNav({ categories, activeCategoryName }: CategoryTreeNavProps) {
  const [open, setOpen] = useState(false)
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(categories[0]?.slug ?? null)
  const [visualsBySlug, setVisualsBySlug] = useState<Record<string, VisualCard[]>>({})
  const [visualsLoaded, setVisualsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [open])

  // Fetched once, on first open, not on every render — a handful of small
  // requests (one per category), cached from then on so hovering between
  // categories never re-fetches.
  useEffect(() => {
    if (!open || visualsLoaded) return
    let cancelled = false
    Promise.all(categories.map((category) => fetchVisualsByCategory(category.slug)))
      .then((results) => {
        if (cancelled) return
        const bySlug: Record<string, VisualCard[]> = {}
        categories.forEach((category, index) => {
          bySlug[category.slug] = results[index]
        })
        setVisualsBySlug(bySlug)
        setVisualsLoaded(true)
      })
      .catch(() => {
        // Best-effort: the right pane just shows nothing for an
        // unfetchable category rather than blocking the bubbles.
      })
    return () => {
      cancelled = true
    }
  }, [open, visualsLoaded, categories])

  const maxCount = Math.max(0, ...categories.map((category) => category.publishedCount))
  const hovered = categories.find((category) => category.slug === hoveredSlug) ?? categories[0] ?? null
  const hoveredVisuals = hovered ? (visualsBySlug[hovered.slug] ?? []) : []

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
      >
        {activeCategoryName ? `Category: ${activeCategoryName}` : 'Categories'} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div
          className="bg-surface border-line absolute top-full left-0 z-10 mt-2 flex max-h-[80vh] flex-col overflow-hidden rounded-lg border shadow-lg sm:flex-row"
          style={{ width: 'min(34rem, calc(100vw - 3rem))' }}
        >
          <div className="flex flex-1 flex-wrap content-start items-start gap-3 p-4">
            {categories.map((category) => (
              <CategoryBubble
                key={category.slug}
                category={category}
                size={bubbleSize(category.publishedCount, maxCount)}
                isHovered={category.slug === hoveredSlug}
                onHover={() => setHoveredSlug(category.slug)}
                theme={theme}
              />
            ))}
          </div>

          {hovered && (
            <div className="border-line flex w-full shrink-0 flex-col border-t sm:w-48 sm:border-t-0 sm:border-l">
              <div className="border-line border-b px-3 py-2">
                <span
                  className="font-mono text-[11px] tracking-wide uppercase"
                  style={{ color: displayColor(hovered.color, theme) }}
                >
                  {hovered.name}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto p-2">
                {hoveredVisuals.length === 0 ? (
                  <p className="text-ink-muted px-1 py-1 font-mono text-xs">No visuals yet.</p>
                ) : (
                  <ul className="m-0 list-none space-y-1 p-0">
                    {hoveredVisuals.map((visual) => (
                      <li key={visual.slug}>
                        <p className="text-ink/80 truncate py-0.5 font-mono text-xs hover:underline">
                          {visual.title}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
