import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVisualsByCategory } from '../api/visuals'
import type { Category } from '../domain/Category'
import type { VisualCard } from '../domain/Visual'
import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

interface CategoryTreeNavProps {
  categories: Category[]
  activeCategoryName?: string
}

// The header's "Categories" hover dropdown, restored alongside the
// dedicated `/categories` page (see docs/DECISIONS.md): hovering the link
// previews every category as a plain name in a list — no bubbles/circles
// here, that's what the dedicated page is for — and hovering a name (not
// clicking) lists that category's visuals in the pane on the right.
// Clicking either the link or a name navigates: the link to `/categories`,
// a name to its own `/c/:slug`.
export function CategoryTreeNav({ categories, activeCategoryName }: CategoryTreeNavProps) {
  const [open, setOpen] = useState(false)
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(categories[0]?.slug ?? null)
  const [visualsBySlug, setVisualsBySlug] = useState<Record<string, VisualCard[]>>({})
  const [visualsLoaded, setVisualsLoaded] = useState(false)
  const { theme } = useTheme()

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
        // unfetchable category rather than blocking the list.
      })
    return () => {
      cancelled = true
    }
  }, [open, visualsLoaded, categories])

  const hovered = categories.find((category) => category.slug === hoveredSlug) ?? categories[0] ?? null
  const hoveredVisuals = hovered ? (visualsBySlug[hovered.slug] ?? []) : []

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        to="/categories"
        className="text-ink/70 hover:text-ink hover:border-ink/40 border-line inline-block rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
      >
        {activeCategoryName ? `Category: ${activeCategoryName}` : 'Categories'}
      </Link>
      {open && (
        // The wrapper — not the visible panel — sits flush against the
        // link (`top-full`, no margin) and carries the visual gap as its
        // own `pt-2` padding instead. Padding is still part of the
        // element's hoverable box, a margin isn't: with the gap as margin
        // on the panel, that strip between the link and the panel wasn't
        // covered by any element, so the mouse crossing it registered as
        // leaving this whole container and closed the dropdown before it
        // ever reached the panel.
        <div className="absolute top-full left-0 z-10 pt-2" style={{ width: 'min(26rem, calc(100vw - 3rem))' }}>
          <div className="bg-surface border-line flex max-h-[80vh] flex-col overflow-hidden rounded-lg border shadow-lg sm:flex-row">
            <ul className="m-0 min-w-[9rem] flex-1 list-none space-y-0.5 overflow-y-auto p-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/c/${category.slug}`}
                    onMouseEnter={() => setHoveredSlug(category.slug)}
                    className="hover:bg-ink/5 block rounded px-2 py-1 font-mono text-xs tracking-wide transition-colors"
                    style={{ color: displayColor(category.color, theme) }}
                  >
                    {category.name} <span className="text-ink-muted">({category.publishedCount})</span>
                  </Link>
                </li>
              ))}
            </ul>

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
        </div>
      )}
    </div>
  )
}
