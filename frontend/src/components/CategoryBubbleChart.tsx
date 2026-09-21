import { Link } from 'react-router-dom'
import type { Category } from '../domain/Category'

interface CategoryBubbleChartProps {
  categories: Category[]
}

const MIN_BUBBLE = 88
const MAX_BUBBLE = 200

// Diameter scales with how many published visuals a category has — the
// point of "bubbles," not a fixed grid of same-size circles. A category
// with none still gets MIN_BUBBLE, not zero: it's still a real, clickable
// category, just the smallest one on screen.
function bubbleSize(count: number, maxCount: number): number {
  if (maxCount === 0) return MIN_BUBBLE
  return MIN_BUBBLE + (count / maxCount) * (MAX_BUBBLE - MIN_BUBBLE)
}

// An embedded chart, not a menu: every category as a bubble sized by its
// published-visual count, clicking one goes straight to its page
// (/c/:slug). No fill — outline only, in the category's own subway color
// — and white text, per feedback on the fill/pastel version this replaced
// (see docs/DECISIONS.md).
export function CategoryBubbleChart({ categories }: CategoryBubbleChartProps) {
  const maxCount = Math.max(0, ...categories.map((category) => category.publishedCount))

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-6">
      {categories.map((category) => {
        const size = bubbleSize(category.publishedCount, maxCount)
        return (
          <Link
            key={category.slug}
            to={`/c/${category.slug}`}
            className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border-2 text-center transition-transform hover:scale-105"
            style={{ width: size, height: size, borderColor: category.color }}
          >
            <span className="font-mono text-xs font-bold break-words text-white">{category.name}</span>
            <span className="font-mono text-[11px] text-white opacity-70">{category.publishedCount}</span>
          </Link>
        )
      })}
    </div>
  )
}
