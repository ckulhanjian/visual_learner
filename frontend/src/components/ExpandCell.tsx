import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

interface ExpandCellProps {
  categoryColor: string
}

// The 4th cell in the preview grid — stubbed, since /c/:slug isn't built yet
// (see docs/DECISIONS.md). Disabled rather than a dead link. Deliberately
// understated next to the visual cards: no border, no icon, just a link-like
// label, so it reads as "there's more" rather than competing with the cards.
//
// No `aspect-square` — a visual card's own <li> is taller than that (image
// plus its title/summary text below), and CSS grid's default `stretch`
// already sizes every cell in the row to match the tallest one. Bottom-
// aligning this cell's own content is what actually lines its text up with
// where the cards' text ends, not fighting the grid for height.
export function ExpandCell({ categoryColor }: ExpandCellProps) {
  const { theme } = useTheme()
  return (
    <li className="flex flex-col items-center justify-end p-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Category pages aren't built yet"
        className="rounded px-2 py-1 font-mono text-xs opacity-70 hover:italic"
        style={{ color: displayColor(categoryColor, theme) }}
      >
        See all visuals
      </button>
    </li>
  )
}
