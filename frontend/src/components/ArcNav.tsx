import { useEffect, useRef, useState } from 'react'
import type { Category } from '../domain/Category'

interface ArcNavProps {
  categories: Category[]
}

const ARC_SPAN_DEGREES = 100
const ARC_RADIUS = 260
const ARC_HEIGHT = 170
const HALF_SPAN_RADIANS = (ARC_SPAN_DEGREES / 2) * (Math.PI / 180)
// The pixel width the arc above is designed for. Narrower containers (phones)
// scale the radius down instead of letting the outer labels clip offscreen.
const DESIGN_WIDTH = 640
const MIN_RADIUS_SCALE = 0.45

function angleForIndex(index: number, count: number): number {
  if (count <= 1) return 0
  const start = -ARC_SPAN_DEGREES / 2
  const step = ARC_SPAN_DEGREES / (count - 1)
  return start + index * step
}

// A dome, not a valley: center highest, ends resting at y=0 — the "rotating
// arc of names" from docs/CLAUDE.md's design language, not two stacked rows.
function positionForAngle(angleDegrees: number, radius: number) {
  const radians = (angleDegrees * Math.PI) / 180
  const crestHeight = radius * (1 - Math.cos(HALF_SPAN_RADIANS))
  return {
    x: Math.sin(radians) * radius,
    y: radius * Math.cos(radians) - (radius - crestHeight),
  }
}

function useContainerWidth() {
  const ref = useRef<HTMLElement | null>(null)
  const [width, setWidth] = useState(DESIGN_WIDTH)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

// The category pages these link to (/c/:slug) don't exist yet — see
// docs/DECISIONS.md #5.2 — so each item is a hover/focus target only for now,
// not a real link.
export function ArcNav({ categories }: ArcNavProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const { ref, width } = useContainerWidth()

  if (categories.length === 0) {
    return null
  }

  const scale = Math.max(MIN_RADIUS_SCALE, Math.min(1, width / DESIGN_WIDTH))
  const radius = ARC_RADIUS * scale

  const restingAngle = angleForIndex((categories.length - 1) / 2, categories.length)
  const dotAngle = activeIndex !== null ? angleForIndex(activeIndex, categories.length) : restingAngle
  const dotPosition = positionForAngle(dotAngle, radius)

  function itemProps(index: number) {
    return {
      onMouseEnter: () => setActiveIndex(index),
      onFocus: () => setActiveIndex(index),
      onMouseLeave: () => setActiveIndex(null),
      onBlur: () => setActiveIndex(null),
    }
  }

  return (
    <nav ref={ref} aria-label="Categories" className="mx-auto w-full" style={{ maxWidth: 760 }}>
      {/* Below sm, the arc's radius has to shrink faster than the labels can,
          which collides text instead — a plain wrapped list degrades cleanly. */}
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-3 p-0 sm:hidden">
        {categories.map((category, index) => (
          <li key={category.slug}>
            <button
              type="button"
              {...itemProps(index)}
              className="whitespace-nowrap rounded-full px-2 py-1 font-mono text-sm"
              style={{ color: category.color }}
              title={category.blurb}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>

      <ul className="relative m-0 hidden list-none p-0 sm:block" style={{ height: ARC_HEIGHT }}>
        {categories.map((category, index) => {
          const { x, y } = positionForAngle(angleForIndex(index, categories.length), radius)
          return (
            <li
              key={category.slug}
              className="absolute bottom-0 -translate-x-1/2"
              style={{ left: `calc(50% + ${x}px)`, transform: `translate(-50%, ${-y}px)` }}
            >
              <button
                type="button"
                {...itemProps(index)}
                className="whitespace-nowrap rounded-full px-2 py-1 font-mono text-sm transition-opacity"
                style={{ color: category.color }}
                title={category.blurb}
              >
                {category.name}
              </button>
            </li>
          )
        })}
        <li
          aria-hidden="true"
          className="bg-marker absolute bottom-0 h-2 w-2 rounded-full transition-transform duration-300 ease-out"
          style={{ left: '50%', transform: `translate(-50%, ${-(dotPosition.y + 14)}px) translateX(${dotPosition.x}px)` }}
        />
      </ul>
    </nav>
  )
}
