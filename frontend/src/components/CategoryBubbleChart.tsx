import type { CSSProperties } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryAsciiArt } from './CategoryAsciiArt'
import type { Category } from '../domain/Category'
import { hashString, mulberry32 } from '../domain/seededRandom'
import { useTheme } from '../theme/useTheme'

interface CategoryBubbleChartProps {
  categories: Category[]
}

const MIN_BUBBLE = 88
const MAX_BUBBLE = 200
// The "poster" every bubble has to fit inside — restricted to the middle
// 60% of the container's width (20% whitespace on each side) and the
// middle 85% of its height (5% top, 10% bottom), per feedback asking for
// a bounded frame rather than letting bubbles spread across the whole page.
const MARGIN_X = 0.2
const MARGIN_TOP = 0.05
const MARGIN_BOTTOM = 0.1
const RELAXATION_PASSES = 800
// The Link's own `hover:scale-105` grows a bubble by 5% on hover — packing
// has to leave enough breathing room that a grown bubble still can't touch
// its neighbor, not just enough for the bubbles at rest. A little more
// than 1.05 so they clear each other with margin to spare, not exactly meet.
const HOVER_SAFETY_FACTOR = 1.12
// If a full relaxation still leaves an overlap (the margin box just isn't
// big enough for every bubble at its natural size — a narrow viewport),
// shrink every bubble and try again rather than shipping bubbles that
// touch or overlap.
const MAX_SHRINK_ATTEMPTS = 6
const SHRINK_FACTOR = 0.88
// Bubbles idly float (see `bubbleFloat` below) by up to this many pixels
// on each axis. Two neighbors could drift toward each other at once, so
// packing has to reserve twice this on top of the hover margin, or the
// float itself could produce the overlap the packing was built to prevent.
const FLOAT_AMPLITUDE = 7
const FLOAT_MARGIN = FLOAT_AMPLITUDE * 2

// Diameter scales with how many published visuals a category has — the
// point of "bubbles," not a fixed grid of same-size circles. A category
// with none still gets MIN_BUBBLE, not zero: it's still a real, clickable
// category, just the smallest one on screen.
function bubbleSize(count: number, maxCount: number): number {
  if (maxCount === 0) return MIN_BUBBLE
  return MIN_BUBBLE + (count / maxCount) * (MAX_BUBBLE - MIN_BUBBLE)
}

interface Placement {
  category: Category
  size: number
  x: number
  y: number
}

interface FloatParams {
  duration: number
  delay: number
  dx: number
  dy: number
}

// Deterministic per-category float — a different seed suffix than any
// other use of the category's slug (`categoryArt.ts` seeds its own pattern
// straight off the slug), otherwise two independently "random" things would
// move in lockstep for no reason other than sharing a hash input.
function bubbleFloat(slug: string): FloatParams {
  const rand = mulberry32(hashString(`${slug}-float`))
  const angle = rand() * Math.PI * 2
  return {
    duration: 4 + rand() * 3,
    delay: rand() * 3,
    dx: Math.cos(angle) * FLOAT_AMPLITUDE,
    dy: Math.sin(angle) * FLOAT_AMPLITUDE,
  }
}

// Keeps a bubble's center inside [lo, hi] when the margin box is wide
// enough for it; when the bubble itself is bigger than the box (a very
// narrow viewport), centers it instead of inverting the clamp.
function clamp(value: number, lo: number, hi: number): number {
  return lo <= hi ? Math.min(Math.max(value, lo), hi) : (lo + hi) / 2
}

// True while any pair is closer than `HOVER_SAFETY_FACTOR` times the sum of
// their radii — the check a plain relaxation pass can't answer for itself,
// since "no pair moved this pass" and "no pair overlaps" aren't the same
// thing when passes run out early.
function hasOverlap(points: Placement[]): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]
      const b = points[j]
      const distance = Math.hypot(b.x - a.x, b.y - a.y)
      const minDistance = ((a.size + b.size) / 2) * HOVER_SAFETY_FACTOR + FLOAT_MARGIN
      if (distance < minDistance - 0.5) return true
    }
  }
  return false
}

// Nudges every overlapping pair apart along the line between their
// centers and clamps each bubble back inside the margin box, repeated
// until stable (or out of passes). `HOVER_SAFETY_FACTOR` on the minimum
// distance means "stable" already accounts for the hover-grown size, not
// just the resting one.
function relax(points: Placement[], minX: number, maxX: number, minY: number, maxY: number): void {
  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy) || 0.01
        const minDistance = ((a.size + b.size) / 2) * HOVER_SAFETY_FACTOR + FLOAT_MARGIN
        if (distance < minDistance) {
          moved = true
          const overlap = (minDistance - distance) / 2
          const nx = dx / distance
          const ny = dy / distance
          a.x -= nx * overlap
          a.y -= ny * overlap
          b.x += nx * overlap
          b.y += ny * overlap
        }
      }
    }
    for (const point of points) {
      point.x = clamp(point.x, minX + point.size / 2, maxX - point.size / 2)
      point.y = clamp(point.y, minY + point.size / 2, maxY - point.size / 2)
    }
    if (!moved) break
  }
}

// A minimal circle-packing relaxation — no d3-force dependency (deferred,
// per docs/ARCHITECTURE.md). Bubbles seed along a golden-angle spiral
// (biggest nearest center, matching the Pareto-cluster reference this
// design was asked for), then get nudged apart pairwise and clamped back
// inside the margin box until nothing overlaps — including at the hover
// size, not just at rest (see `HOVER_SAFETY_FACTOR`). If the margin box is
// too small for every bubble to fit at its natural size, every bubble
// shrinks by `SHRINK_FACTOR` and the relaxation runs again, rather than
// shipping a layout where bubbles touch or overlap.
function packBubbles(categories: Category[], width: number, height: number): Placement[] {
  const maxCount = Math.max(0, ...categories.map((category) => category.publishedCount))
  const minX = width * MARGIN_X
  const maxX = width * (1 - MARGIN_X)
  const minY = height * MARGIN_TOP
  const maxY = height * (1 - MARGIN_BOTTOM)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const spreadX = Math.max(1, (maxX - minX) / 2)
  const spreadY = Math.max(1, (maxY - minY) / 2)

  const sorted = [...categories].sort((a, b) => b.publishedCount - a.publishedCount)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  let points: Placement[] = []
  let scale = 1
  for (let attempt = 0; attempt < MAX_SHRINK_ATTEMPTS; attempt++) {
    points = sorted.map((category, i) => {
      const radius = Math.sqrt((i + 0.5) / sorted.length)
      const angle = i * goldenAngle
      return {
        category,
        size: bubbleSize(category.publishedCount, maxCount) * scale,
        x: centerX + radius * spreadX * Math.cos(angle),
        y: centerY + radius * spreadY * Math.sin(angle),
      }
    })
    relax(points, minX, maxX, minY, maxY)
    if (!hasOverlap(points)) break
    scale *= SHRINK_FACTOR
  }

  return points
}

// An embedded chart, not a menu: every category clustered into one bounded
// frame, sized by its published-visual count, clicking one goes straight
// to its page (/c/:slug). No fill — outline only, in the category's own
// subway color — and text in the page's own ink color (`text-ink`, a CSS
// variable that already flips with `data-theme` — see tokens.css), not a
// literal white: white read fine in dark mode but was nearly invisible on
// the light-theme cream background, a known limit flagged when the
// original literal-white feedback was implemented (see docs/DECISIONS.md).
export function CategoryBubbleChart({ categories }: CategoryBubbleChartProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    function measure() {
      if (!element) return
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const placements = size.width > 0 && size.height > 0 ? packBubbles(categories, size.width, size.height) : []

  return (
    <div ref={containerRef} className="relative h-[70vh] w-full">
      {placements.map(({ category, size: diameter, x, y }) => {
        const float = bubbleFloat(category.slug)
        return (
          // The float animation lives on this wrapper, not the Link below —
          // both it and the Link's own `hover:scale-105` set `transform`,
          // and an idly-running CSS animation always wins that fight, which
          // would have silently killed the hover-grow effect.
          <div
            key={category.slug}
            className="animate-bubble-float absolute"
            style={
              {
                left: x - diameter / 2,
                top: y - diameter / 2,
                width: diameter,
                height: diameter,
                '--float-duration': `${float.duration}s`,
                '--float-delay': `${float.delay}s`,
                '--float-dx': `${float.dx}px`,
                '--float-dy': `${float.dy}px`,
              } as CSSProperties
            }
          >
            <Link
              to={`/c/${category.slug}`}
              className="relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-2 text-center transition-transform hover:z-10 hover:scale-105"
              style={{ borderColor: category.color }}
            >
              {/* The bubble's "cover" — a per-category ASCII texture, not a
                  real snapshot (there's nothing to photograph yet for most
                  categories) — clipped to the circle behind the label. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                <CategoryAsciiArt category={category} theme={theme} animation="pulse" fontSizeClassName="text-[5px]" />
              </div>
              <span className="text-ink relative font-mono text-xs font-bold break-words">{category.name}</span>
              <span className="text-ink relative font-mono text-[11px] opacity-70">{category.publishedCount}</span>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
