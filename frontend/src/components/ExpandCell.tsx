import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

interface ExpandCellProps {
  categoryColor: string
}

// The 4th cell in the preview grid — stubbed, since /c/:slug isn't built yet
// (see docs/DECISIONS.md). Disabled rather than a dead link. Deliberately
// understated next to the visual cards: no border, no icon, just a link-like
// label, so it reads as "there's more" rather than competing with the cards.
export function ExpandCell({ categoryColor }: ExpandCellProps) {
  const { theme } = useTheme()
  return (
    <li className="flex aspect-square items-center justify-center">
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Category pages aren't built yet"
        className="rounded px-2 py-1 font-mono text-xs opacity-70"
        style={{ color: displayColor(categoryColor, theme) }}
      >
        See all visuals
      </button>
    </li>
  )
}
