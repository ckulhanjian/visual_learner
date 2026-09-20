import { useState } from 'react'

interface Point {
  x: number
  y: number
}

interface Square {
  x: number
  y: number
  size: number
}

const TERMS = 8
const DIRECTIONS = ['top', 'left', 'bottom', 'right'] as const

function buildFibonacciSquares(terms: number): Square[] {
  const fib = [1, 1]
  while (fib.length < terms) fib.push(fib[fib.length - 1] + fib[fib.length - 2])

  const squares: Square[] = [{ x: 0, y: 0, size: fib[0] }]
  let rect = { x: 0, y: 0, w: fib[0], h: fib[0] }

  // The second square always attaches to the right of the first — after
  // that, direction cycles top/left/bottom/right, each new square sized to
  // the growing rectangle's longer side (the Fibonacci property itself).
  squares.push({ x: rect.x + rect.w, y: rect.y, size: fib[1] })
  rect = { x: rect.x, y: rect.y, w: rect.w + fib[1], h: Math.max(rect.h, fib[1]) }

  for (let i = 2; i < terms; i++) {
    const size = fib[i]
    const dir = DIRECTIONS[(i - 2) % DIRECTIONS.length]
    if (dir === 'top') {
      squares.push({ x: rect.x, y: rect.y - size, size })
      rect = { x: rect.x, y: rect.y - size, w: rect.w, h: rect.h + size }
    } else if (dir === 'left') {
      squares.push({ x: rect.x - size, y: rect.y, size })
      rect = { x: rect.x - size, y: rect.y, w: rect.w + size, h: rect.h }
    } else if (dir === 'bottom') {
      squares.push({ x: rect.x, y: rect.y + rect.h, size })
      rect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h + size }
    } else {
      squares.push({ x: rect.x + rect.w, y: rect.y, size })
      rect = { x: rect.x, y: rect.y, w: rect.w + size, h: rect.h }
    }
  }
  return squares
}

function corners(square: Square) {
  return {
    TL: { x: square.x, y: square.y },
    TR: { x: square.x + square.size, y: square.y },
    BL: { x: square.x, y: square.y + square.size },
    BR: { x: square.x + square.size, y: square.y + square.size },
  }
}

// A square's diagonal-from-`point` corner — true regardless of which of the
// two remaining corners an arc's center ends up being, which is what lets
// buildSpiralPath below chain arcs without tracking centers explicitly.
function diagonalOf(square: Square, point: Point): Point {
  const c = corners(square)
  if (point.x === c.TL.x && point.y === c.TL.y) return c.BR
  if (point.x === c.BR.x && point.y === c.BR.y) return c.TL
  if (point.x === c.TR.x && point.y === c.TR.y) return c.BL
  return c.TR
}

interface SpiralPath {
  d: string
  minX: number
  minY: number
  width: number
  height: number
}

function buildSpiralPath(squares: Square[]): SpiralPath {
  let point: Point = { x: squares[0].x, y: squares[0].y }
  const commands = [`M ${point.x} ${point.y}`]
  let minX = point.x
  let minY = point.y
  let maxX = point.x
  let maxY = point.y

  for (const square of squares) {
    minX = Math.min(minX, square.x)
    minY = Math.min(minY, square.y)
    maxX = Math.max(maxX, square.x + square.size)
    maxY = Math.max(maxY, square.y + square.size)

    const end = diagonalOf(square, point)
    commands.push(`A ${square.size} ${square.size} 0 0 1 ${end.x} ${end.y}`)
    point = end
  }

  return { d: commands.join(' '), minX, minY, width: maxX - minX, height: maxY - minY }
}

const SPIRAL = buildSpiralPath(buildFibonacciSquares(TERMS))
const PADDING = 1
const VIEW_BOX = `${SPIRAL.minX - PADDING} ${SPIRAL.minY - PADDING} ${SPIRAL.width + PADDING * 2} ${SPIRAL.height + PADDING * 2}`

// Cells across the spiral's wider axis — coarse enough to read as blocky,
// pixel-art "steps" rather than a smooth curve (what "ascii art" meant here:
// a curve rasterized onto a visible grid, not a font-character rendering).
const GRID_COLUMNS = 34

interface Cell {
  col: number
  row: number
}

let cachedPixelPath: Cell[] | null = null

// Walks the true (smooth) spiral curve and buckets it into grid cells,
// recording one entry each time the curve crosses into a new cell — a
// Bresenham-style rasterization, but driven by the browser's own arc math
// (via a detached, unrendered <path>) rather than re-deriving each arc's
// center analytically.
function computePixelPath(): Cell[] {
  if (cachedPixelPath) return cachedPixelPath
  if (typeof document === 'undefined') return []

  const svgNs = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNs, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.style.width = '0'
  svg.style.height = '0'
  svg.style.overflow = 'hidden'
  const path = document.createElementNS(svgNs, 'path')
  path.setAttribute('d', SPIRAL.d)
  svg.appendChild(path)
  document.body.appendChild(svg)

  const cellSize = SPIRAL.width / GRID_COLUMNS
  const totalLength = path.getTotalLength()
  // Dense enough that the curve can't skip over a cell between samples.
  const sampleCount = Math.max(1, Math.ceil(totalLength / (cellSize * 0.35)))
  const cells: Cell[] = []
  let lastCol = NaN
  let lastRow = NaN
  for (let i = 0; i <= sampleCount; i++) {
    const point = path.getPointAtLength((i / sampleCount) * totalLength)
    const col = Math.floor((point.x - SPIRAL.minX) / cellSize)
    const row = Math.floor((point.y - SPIRAL.minY) / cellSize)
    if (col !== lastCol || row !== lastRow) {
      cells.push({ col, row })
      lastCol = col
      lastRow = row
    }
  }

  document.body.removeChild(svg)
  cachedPixelPath = cells
  return cells
}

interface FibonacciSpiralProps {
  progress: number // 0 (undrawn) to 1 (fully drawn)
  color: string
}

// A decorative accompaniment to the spinner: fills in, cell by cell, as
// `progress` advances through the categories, and — since progress is
// derived from the same continuous, wrapping position the spinner already
// tracks — resets to undrawn the instant you cycle back to the first
// category. Rendered as a grid of squares rather than a smooth stroke, for
// a pixel-art / ascii-art read. See docs/DECISIONS.md.
export function FibonacciSpiral({ progress, color }: FibonacciSpiralProps) {
  // Lazy initializer: runs once on mount rather than on every render, since
  // it touches the DOM (a detached, throwaway <path> to reuse the browser's
  // own arc math — see computePixelPath) and the result never changes.
  const [cells] = useState(computePixelPath)
  if (cells.length === 0) return null

  const cellSize = SPIRAL.width / GRID_COLUMNS
  const visibleCount = Math.round(progress * cells.length)

  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      shapeRendering="crispEdges"
      // The underlying Fibonacci-squares construction grows wider than tall
      // (successive squares approach the golden ratio, ~1.6:1) — rotating
      // the whole rendered grid 90° turns that long axis vertical without
      // touching the geometry/rasterization math, which doesn't care about
      // screen orientation.
      style={{ transform: 'rotate(90deg)' }}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {cells.slice(0, visibleCount).map((cell, index) => (
        <rect
          key={index}
          x={SPIRAL.minX + cell.col * cellSize}
          y={SPIRAL.minY + cell.row * cellSize}
          width={cellSize}
          height={cellSize}
          fill={color}
          opacity={0.55}
        />
      ))}
    </svg>
  )
}
