import { useMemo } from 'react'
import { generateCategoryArt } from '../domain/categoryArt'
import type { Category } from '../domain/Category'
import { displayColor } from '../theme/categoryColor'
import type { Theme } from '../theme/useTheme'

interface CategoryAsciiArtProps {
  category: Category
  theme: Theme
  animation?: 'float' | 'pulse'
  fontSizeClassName?: string
}

// A decorative, non-interactive ASCII emblem for a category — generated
// once per category (memoized on slug), not fetched or stored anywhere.
// Purely presentational: callers own where and how big it sits (see
// Home.tsx and CategoryPage.tsx), this only owns the art, its color, and
// its idle animation.
export function CategoryAsciiArt({ category, theme, animation = 'float', fontSizeClassName }: CategoryAsciiArtProps) {
  const art = useMemo(() => generateCategoryArt(category.slug), [category.slug])
  const animationClass = animation === 'pulse' ? 'animate-ascii-pulse' : 'animate-ascii-float'

  return (
    <pre
      aria-hidden="true"
      className={`pointer-events-none m-0 leading-none font-mono whitespace-pre select-none ${fontSizeClassName ?? 'text-[10px]'} ${animationClass}`}
      style={{ color: displayColor(category.color, theme) }}
    >
      {art}
    </pre>
  )
}
