// A tiny, fast, deterministic string hash + PRNG pair — good enough for
// seeding visual variety (ASCII-art layout, per-bubble float timing) from a
// stable key like a category slug, so the same category always looks and
// moves the same way across reloads. Not for anything security-sensitive.

export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

// mulberry32 — the standard small-state PRNG for exactly this use case.
export function mulberry32(seed: number): () => number {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
