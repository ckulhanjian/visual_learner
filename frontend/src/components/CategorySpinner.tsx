import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Category } from '../domain/Category'

interface CategorySpinnerProps {
  categories: Category[]
  activeSlug: string | null
  onActiveChange: (category: Category) => void
}

const ITEM_HEIGHT = 28 // px between rows
const VISIBLE_HALF = 6 // rows rendered above/below center (13 total)
const MAX_TILT_DEGREES = 68
const WHEEL_SENSITIVITY = 0.0032 // wheel deltaY px -> fraction of a row
const DESKTOP_QUERY = '(min-width: 640px)' // Tailwind's sm

function wrap(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
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

// Bottom-right, infinitely-wrapping, driven by wheel + arrow keys rather than
// real page scroll — see docs/DECISIONS.md for why. A fixed set of DOM slots
// each show a modulo-computed category label; only a fractional pixel offset
// (shared by every slot) animates continuously, so the handoff between slots
// at each integer crossing reads as one continuous line, not a snap.
//
// Below sm, the fixed-size spinner has nowhere to go without overlapping the
// preview panel on a narrow viewport, and "scroll to browse" doesn't fit a
// touch device anyway — a plain tap-to-select row takes over instead.
export function CategorySpinner({ categories, activeSlug, onActiveChange }: CategorySpinnerProps) {
  const count = categories.length
  const isDesktopWidth = useIsDesktopWidth()
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
      const index = wrap(Math.round(rawPosition), count)
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

  const slots = useMemo(
    () => Array.from({ length: VISIBLE_HALF * 2 + 1 }, (_, i) => i - VISIBLE_HALF),
    [],
  )

  if (count === 0) {
    return null
  }

  const roundedPosition = Math.round(position)
  const fraction = position - roundedPosition // in [-0.5, 0.5)
  const pixelOffset = -fraction * ITEM_HEIGHT

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
        className="fixed right-6 bottom-6 hidden h-[364px] w-[280px] overflow-hidden focus:outline-none sm:block"
        style={{ maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)' }}
      >
        <div className="relative h-full">
          <div
            aria-hidden="true"
            className="bg-marker absolute top-1/2 right-2 h-2 w-2 -translate-y-1/2 rounded-full"
          />
          {slots.map((slot) => {
            const categoryIndex = wrap(roundedPosition + slot, count)
            const category = categories[categoryIndex]
            const rotation = Math.max(
              -MAX_TILT_DEGREES,
              Math.min(MAX_TILT_DEGREES, slot * (MAX_TILT_DEGREES / VISIBLE_HALF)),
            )
            const isActive = slot === 0
            return (
              <div
                key={slot}
                role="option"
                aria-selected={isActive}
                className="absolute top-1/2 right-6 origin-right whitespace-nowrap font-mono text-sm"
                style={{
                  transform: `translateY(calc(-50% + ${slot * ITEM_HEIGHT + pixelOffset}px)) rotate(${rotation}deg)`,
                  color: category.color,
                  opacity: isActive ? 1 : Math.max(0.2, 1 - Math.abs(slot) / (VISIBLE_HALF + 1)),
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
