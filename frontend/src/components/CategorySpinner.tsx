import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category } from '../domain/Category'

interface CategorySpinnerProps {
  categories: Category[]
  activeSlug: string | null
  onActiveChange: (category: Category) => void
}

const BASE_RADIUS = 190 // px from the (off-screen right) center to the selected label, at REFERENCE_WIDTH
// The radius the layout was tuned at, and how far it's allowed to shrink.
// Below sm this component switches to the tap-row fallback entirely, but
// between sm and a full desktop window the fixed-size circle would reach far
// enough left to overlap the centered preview grid — scaling it down with
// the viewport keeps it clear.
const REFERENCE_WIDTH = 1280
const MIN_RADIUS_SCALE = 0.45
// However wide the longest label ("Signals & Systems") plus its rotation
// needs beyond the radius itself, or the text clips against the container.
const LABEL_ALLOWANCE = 230
const CONTAINER_HEIGHT = 420
const WHEEL_SENSITIVITY = 0.0032 // wheel deltaY px -> fraction of a step
const DESKTOP_QUERY = '(min-width: 640px)' // Tailwind's sm
const DEG_TO_RAD = Math.PI / 180
// Degrees of arc between adjacent categories. Fixed, not 360/count: with as
// few as 4 categories, dividing the full circle evenly would put immediate
// neighbors 90° from the selected item — fully vertical, unreadable text.
// "No duplicates" means never render a category twice, not that the handful
// that exist must be spread across the whole circle.
const ANGLE_STEP_DEGREES = 22

// Shortest signed distance from `value` to the nearest multiple of `modulus`,
// e.g. wrapToHalfRange(3.2, 4) -> -0.8 (3.2 is 0.8 short of the next lap of 4).
function wrapToHalfRange(value: number, modulus: number): number {
  return value - modulus * Math.round(value / modulus)
}

function useIsDesktopWidth(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const handleChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}

// A true circle whose center sits off-screen at the container's right edge:
// the selected category always sits at the leftmost point of that circle
// (radius pointing due left), and each neighboring category sits a fixed
// angular step further around it — categories before it swing up-and-right,
// categories after it swing down-and-right. With exactly one point per
// category and no repeats, wraparound needs no special-casing: angles are
// periodic, so rotating past a full lap is already seamless.
//
// Below sm, this has nowhere to go without overlapping the preview content
// on a narrow viewport — a plain tap-to-select row takes over instead.
export function CategorySpinner({ categories, activeSlug, onActiveChange }: CategorySpinnerProps) {
  const count = categories.length
  const isDesktopWidth = useIsDesktopWidth()
  const windowWidth = useWindowWidth()
  const radiusScale = Math.max(MIN_RADIUS_SCALE, Math.min(1, windowWidth / REFERENCE_WIDTH))
  const radius = BASE_RADIUS * radiusScale
  const containerWidth = radius + LABEL_ALLOWANCE
  const initialIndex = Math.max(
    0,
    categories.findIndex((category) => category.slug === activeSlug),
  )

  const [position, setPosition] = useState(initialIndex)
  const positionRef = useRef(position)
  const activeIndexRef = useRef(initialIndex)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  const commitIfChanged = useCallback(
    (rawPosition: number) => {
      if (count === 0) return
      const index = ((Math.round(rawPosition) % count) + count) % count
      if (index !== activeIndexRef.current) {
        activeIndexRef.current = index
        onActiveChange(categories[index])
      }
    },
    [categories, count, onActiveChange],
  )

  const movePosition = useCallback(
    (next: number) => {
      setPosition(next)
      commitIfChanged(next)
    },
    [commitIfChanged],
  )

  useEffect(() => {
    if (count === 0 || !isDesktopWidth) return

    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      movePosition(positionRef.current + event.deltaY * WHEEL_SENSITIVITY)
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        movePosition(Math.round(positionRef.current) + 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        movePosition(Math.round(positionRef.current) - 1)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [count, isDesktopWidth, movePosition])

  if (count === 0) {
    return null
  }

  // Same rounding the wheel/keyboard handlers use to decide which category
  // is "active" — keeps the dot's color in lockstep with onActiveChange.
  const activeIndex = ((Math.round(position) % count) + count) % count
  const activeColor = categories[activeIndex].color

  return (
    <>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 sm:hidden">
        {categories.map((category) => (
          <li key={category.slug}>
            <button
              type="button"
              onClick={() => {
                activeIndexRef.current = categories.indexOf(category)
                onActiveChange(category)
              }}
              className="whitespace-nowrap rounded-full px-2 py-1 font-mono text-sm"
              style={{
                color: category.color,
                textDecoration: category.slug === activeSlug ? 'underline' : 'none',
              }}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>

      <div
        aria-label="Categories"
        role="listbox"
        tabIndex={0}
        className="fixed top-1/2 right-3 hidden -translate-y-1/2 overflow-hidden focus:outline-none sm:block"
        style={{
          height: CONTAINER_HEIGHT,
          width: containerWidth,
          maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        }}
      >
        {/* Sits just past the selected label's right edge, not on top of it —
            both anchor from the same point, so without an offset the dot
            would overlap the label's last character. Colored to match
            whichever category is active, so it's clear which one the
            preview grid below belongs to. */}
        <div
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-y-1/2 rounded-full transition-colors duration-150"
          style={{ right: radius - 14, top: '50%', backgroundColor: activeColor }}
        />
        {categories.map((category, index) => {
          const diff = wrapToHalfRange(index - position, count)
          const angleDeg = 180 - diff * ANGLE_STEP_DEGREES
          const angleRad = angleDeg * DEG_TO_RAD
          const x = radius * Math.cos(angleRad)
          const y = radius * Math.sin(angleRad)
          const rotation = -diff * ANGLE_STEP_DEGREES
          const isActive = Math.abs(diff) < 0.5 / count
          const opacity = Math.max(0.2, 1 - Math.abs(diff) / (count / 2))
          return (
            <div
              key={category.slug}
              role="option"
              aria-selected={isActive}
              className="absolute origin-right whitespace-nowrap font-mono text-sm"
              style={{
                right: -x,
                top: `calc(50% + ${y}px)`,
                transform: `translateY(-50%) rotate(${rotation}deg)`,
                color: category.color,
                opacity,
              }}
            >
              {category.name}
            </div>
          )
        })}
      </div>
    </>
  )
}
