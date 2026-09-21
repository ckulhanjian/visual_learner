import { hashString, mulberry32 } from './seededRandom'

const COLS = 52
const ROWS = 26
const RING_COUNT = 5
// Sparse to dense — a ring's own character is picked once per ring, not
// per cell, so one ring reads as one consistent brushstroke rather than
// static noise.
const CHARS = [':', '.', '+', '*', '#']

interface Ring {
  radius: number
  freq: number
  phase: number
  amplitude: number
  thickness: number
  char: string
}

// A generative ASCII "emblem" per category — concentric rings, each
// perturbed by its own sine harmonic so they read as an organic cluster
// rather than perfect circles (the look of the dot-matrix mandala/flower
// references this was asked to evoke), seeded from the category's slug so
// it's the same pattern on every load without storing anything. Letters
// spelling the category name were tried first and dropped — a raster scan
// hits a ring at disconnected arcs per row, so the text came out jumbled
// rather than following the curve — plain density characters read better
// at this size anyway, which is what the majority of the reference images
// actually are.
export function generateCategoryArt(seedKey: string): string {
  const rand = mulberry32(hashString(seedKey))
  const cx = COLS / 2
  const cy = ROWS / 2
  // Characters are roughly twice as tall as wide, so `dy` gets doubled
  // before computing distance — otherwise the rings would render as
  // vertically squashed ellipses instead of circles.
  const maxRadius = Math.min(cx, cy * 2) - 1.5

  const rings: Ring[] = Array.from({ length: RING_COUNT }, (_, i) => ({
    radius: (maxRadius * (i + 1)) / (RING_COUNT + 0.4),
    freq: 3 + Math.floor(rand() * 4),
    phase: rand() * Math.PI * 2,
    amplitude: maxRadius * (0.05 + rand() * 0.07),
    thickness: 0.6 + rand() * 0.5,
    char: CHARS[Math.floor(rand() * CHARS.length)],
  }))

  const lines: string[] = []
  for (let row = 0; row < ROWS; row++) {
    let line = ''
    for (let col = 0; col < COLS; col++) {
      const dx = col + 0.5 - cx
      const dy = (row + 0.5 - cy) * 2
      const distance = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      let cell = ' '
      for (const ring of rings) {
        const ringRadius = ring.radius + ring.amplitude * Math.sin(ring.freq * angle + ring.phase)
        const delta = Math.abs(distance - ringRadius)
        if (delta >= ring.thickness) continue
        // Thins out toward the edge of the ring's own thickness instead of
        // a hard cutoff — reads as hand-scattered dots, not a plotted curve.
        if (rand() > (delta / ring.thickness) * 0.5) {
          cell = ring.char
          break
        }
      }
      line += cell
    }
    lines.push(line)
  }
  return lines.join('\n')
}
