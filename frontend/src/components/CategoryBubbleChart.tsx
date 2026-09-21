import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../domain/Category'

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
const RELAXATION_PASSES = 200

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

// Keeps a bubble's center inside [lo, hi] when the margin box is wide
// enough for it; when the bubble itself is bigger than the box (a very
// narrow viewport), centers it instead of inverting the clamp.
function clamp(value: number, lo: number, hi: number): number {
  return lo <= hi ? Math.min(Math.max(value, lo), hi) : (lo + hi) / 2
}

// A minimal circle-packing relaxation — no d3-force dependency (deferred,
// per docs/ARCHITECTURE.md). Bubbles seed along a golden-angle spiral
// (biggest nearest center, matching the Pareto-cluster reference this
// design was asked for), then get nudged apart pairwise wherever they
// overlap and clamped back inside the margin box every pass. Enough
// passes settles into a tight, mostly non-overlapping cluster; a box this
// restricted still leaves some overlap where there simply isn't room —
// that's the "layered" look, not a bug in the relaxation.
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
  const points = sorted.map((category, i) => {
    const radius = Math.sqrt((i + 0.5) / sorted.length)
    const angle = i * goldenAngle
    return {
      category,
      size: bubbleSize(category.publishedCount, maxCount),
      x: centerX + radius * spreadX * Math.cos(angle),
      y: centerY + radius * spreadY * Math.sin(angle),
    }
  })

  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy) || 0.01
        const minDistance = (a.size + b.size) / 2
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

  return points
}

// An embedded chart, not a menu: every category clustered into one bounded
// frame, sized by its published-visual count, clicking one goes straight
// to its page (/c/:slug). No fill — outline only, in the category's own
// subway color — and white text, per feedback on the fill/pastel version
// this replaced (see docs/DECISIONS.md).
export function CategoryBubbleChart({ categories }: CategoryBubbleChartProps) {
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
      {placements.map(({ category, size: diameter, x, y }) => (
        <Link
          key={category.slug}
          to={`/c/${category.slug}`}
          className="absolute flex flex-col items-center justify-center gap-1 rounded-full border-2 text-center transition-transform hover:z-10 hover:scale-105"
          style={{
            width: diameter,
            height: diameter,
            left: x - diameter / 2,
            top: y - diameter / 2,
            borderColor: category.color,
          }}
        >
          <span className="font-mono text-xs font-bold break-words text-white">{category.name}</span>
          <span className="font-mono text-[11px] text-white opacity-70">{category.publishedCount}</span>
        </Link>
      ))}
    </div>
  )
}
