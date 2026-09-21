import { Link } from 'react-router-dom'
import { displayColor } from '../theme/categoryColor'
import { useTheme } from '../theme/useTheme'

interface ExpandCellProps {
  categorySlug: string
  categoryColor: string
}

// The 4th cell in the preview grid, linking to /c/:slug (docs/ARCHITECTURE.md
// §6) for the category's full list. Deliberately understated next to the
// visual cards: no border, no icon, just a link-like label, so it reads as
// "there's more" rather than competing with the cards.
//
// No `aspect-square` — a visual card's own <li> is taller than that (image
// plus its title/summary text below), and CSS grid's default `stretch`
// already sizes every cell in the row to match the tallest one. Bottom-
// aligning this cell's own content is what actually lines its text up with
// where the cards' text ends, not fighting the grid for height.
//
// No `items-center` either: a visual card's title/summary text starts flush
// against its cell's left edge, so centering this button horizontally made
// it float out of step with them instead of reading as the 4th member of
// the same row. Default (stretch) cross-axis alignment lets the link fill
// the cell's width, which puts its own (left-aligned) text at that same
// left edge.
export function ExpandCell({ categorySlug, categoryColor }: ExpandCellProps) {
  const { theme } = useTheme()
  return (
    <li className="flex flex-col justify-end p-2">
      <Link
        to={`/c/${categorySlug}`}
        className="rounded px-2 py-1 text-left font-mono text-xs opacity-70 hover:italic"
        style={{ color: displayColor(categoryColor, theme) }}
      >
        See all visuals
      </Link>
    </li>
  )
}
