import type { Theme } from './useTheme'

// Blend a hex color toward white by `amount` (0-1).
function lighten(hex: string, amount: number): string {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16))
  const blended = channels.map((channel) => Math.round(channel + (255 - channel) * amount))
  return '#' + blended.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Category colors are fixed subway-line identities (see CLAUDE.md) — this
// doesn't change what a category's color *is*, only how it renders as
// foreground text on a dark background. #0039A6 in particular is close
// enough to the charcoal background's own darkness to read poorly without
// this; a uniform lighten keeps every category consistent rather than
// special-casing just the one that was flagged.
export function displayColor(hex: string, theme: Theme): string {
  return theme === 'dark' ? lighten(hex, 0.32) : hex
}
