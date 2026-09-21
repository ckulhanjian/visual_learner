// A simple outward Archimedean spiral (radius grows linearly with angle) —
// replaces the earlier Fibonacci-squares construction per feedback asking
// for a plain "circle spiral" like a hand-drawn one, not a golden-ratio
// shape. No closed form gives an SVG arc/bezier for this curve, so it's a
// dense polyline sampled along r = t * MAX_RADIUS, theta = t * TURNS * 2π —
// smooth enough at this element's on-screen size that individual segments
// don't read as facets.
const TURNS = 2.75
const SAMPLES = 140
const MAX_RADIUS = 45
const PADDING = 3

function buildSpiralPath(): string {
  const commands: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const angle = t * TURNS * 2 * Math.PI
    const radius = t * MAX_RADIUS
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    commands.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return commands.join(' ')
}

const SPIRAL_PATH = buildSpiralPath()
const HALF_EXTENT = MAX_RADIUS + PADDING
const VIEW_BOX = `${-HALF_EXTENT} ${-HALF_EXTENT} ${HALF_EXTENT * 2} ${HALF_EXTENT * 2}`

interface SpiralProps {
  progress: number // 0 (undrawn) to 1 (fully drawn)
  color: string
}

// A decorative accompaniment to the spinner: draws outward from its center
// as `progress` advances through the categories. See docs/DECISIONS.md.
export function Spiral({ progress, color }: SpiralProps) {
  return (
    <svg viewBox={VIEW_BOX} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      <path
        d={SPIRAL_PATH}
        fill="none"
        stroke={color}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.5}
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1 - progress }}
      />
    </svg>
  )
}
