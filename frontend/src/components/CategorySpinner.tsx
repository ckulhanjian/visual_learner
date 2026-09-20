import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category } from '../domain/Category'
import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'
import { FibonacciSpiral } from './FibonacciSpiral'

interface CategorySpinnerProps {
  categories: Category[]
  activeSlug: string | null
  onActiveChange: (category: Category) => void
}

// Fixed now, not scaled to window width — the spinner lives in its own
// fixed-width flex column (see Home.tsx), so it structurally cannot
// collide with the preview grid regardless of viewport size. A JS-computed
// scale factor was a heuristic working around not having that real layout
// constraint; the constraint is the actual fix.
const RADIUS = 170
const CONTAINER_WIDTH = 440
const CONTAINER_HEIGHT = 420
const SPIRAL_SIZE = 200
const WHEEL_SENSITIVITY = 0.0032 // wheel deltaY px -> fraction of a step
const DESKTOP_QUERY = '(min-width: 1024px)' // Tailwind's lg — matches Home.tsx's column breakpoint
const DEG_TO_RAD = Math.PI / 180
// Degrees of arc between adjacent categories. Fixed, not 360/count: with as
// few as 4 categories, dividing the full circle evenly would put immediate
// neighbors 90° from the selected item — fully vertical, unreadable text.
// "No duplicates" means never render a category twice, not that the handful
// that exist must be spread across the whole circle.
const ANGLE_STEP_DEGREES = 20

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

// A true circle whose center sits off-screen at the container's right edge:
// the selected category always sits at the leftmost point of that circle
// (radius pointing due left), and each neighboring category sits a fixed
// angular step further around it — categories before it swing up-and-right,
// categories after it swing down-and-right. With exactly one point per
// category and no repeats, wraparound needs no special-casing: angles are
// periodic, so rotating past a full lap is already seamless.
//
// Below lg, this has nowhere to go without overlapping the preview content
// on a narrow viewport — a plain tap-to-select row takes over instead.
export function CategorySpinner({ categories, activeSlug, onActiveChange }: CategorySpinnerProps) {
  const count = categories.length
  const isDesktopWidth = useIsDesktopWidth()
  const { theme } = useTheme()
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
  const activeColor = displayColor(categories[activeIndex].color, theme)
  // How far through one full lap of all categories the spinner has turned —
  // wraps to 0 exactly when it lands back on the first category, which is
  // what makes the spiral restart there instead of just looping its reveal.
  const wrappedPosition = ((position % count) + count) % count
  const lapProgress = wrappedPosition / count

  return (
    <>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 lg:hidden">
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
                color: displayColor(category.color, theme),
                textDecoration: category.slug === activeSlug ? 'underline' : 'none',
              }}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>

      <div
        className="hidden lg:flex lg:h-full lg:shrink-0 lg:items-center lg:justify-center"
        style={{ width: CONTAINER_WIDTH }}
      >
        <div
          aria-label="Categories"
          role="listbox"
          tabIndex={0}
          className="relative overflow-hidden focus:outline-none"
          style={{
            height: CONTAINER_HEIGHT,
            width: CONTAINER_WIDTH,
            maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
          }}
        >
          <div className="absolute top-1/2 right-10 -translate-y-1/2" style={{ width: SPIRAL_SIZE, height: SPIRAL_SIZE }}>
            <FibonacciSpiral progress={lapProgress} color={activeColor} />
          </div>

          {/* Sits just past the selected label's right edge, not on top of it —
              both anchor from the same point, so without an offset the dot
              would overlap the label's last character. Colored to match
              whichever category is active, so it's clear which one the
              preview grid below belongs to. */}
          <div
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-colors duration-150"
            style={{ right: RADIUS - 16, top: '50%', backgroundColor: activeColor }}
          />
          {categories.map((category, index) => {
            const diff = wrapToHalfRange(index - position, count)
            const angleDeg = 180 - diff * ANGLE_STEP_DEGREES
            const angleRad = angleDeg * DEG_TO_RAD
            const x = RADIUS * Math.cos(angleRad)
            const y = RADIUS * Math.sin(angleRad)
            const rotation = -diff * ANGLE_STEP_DEGREES
            // Matches whichever index onActiveChange actually committed to,
            // not a distance threshold on the raw continuous position — that
            // drifts slightly off exact integers after enough wheel deltas
            // (each ~1.02 steps, not exactly 1), so a threshold check could
            // land between two categories and mark neither one active.
            const isActive = index === activeIndex
            const opacity = Math.max(0.2, 1 - Math.abs(diff) / (count / 2))
            return (
              <div
                key={category.slug}
                role="option"
                aria-selected={isActive}
                className="absolute top-1/2 origin-right whitespace-nowrap font-mono text-lg"
                style={{
                  right: -x,
                  transform: `translateY(calc(-50% + ${y}px)) rotate(${rotation}deg)`,
                  color: displayColor(category.color, theme),
                  opacity,
                }}
              >
                {category.name}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
