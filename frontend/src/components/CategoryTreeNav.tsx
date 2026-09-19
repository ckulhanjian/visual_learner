import { useEffect, useRef, useState } from 'react'
import type { CategoryTopics, TopicNode } from '../domain/Topic'

interface CategoryTreeNavProps {
  data: CategoryTopics[]
}

interface TopicRowProps {
  topic: TopicNode
  depth: number
}

function TopicRow({ topic, depth }: TopicRowProps) {
  return (
    <li>
      <p className="text-ink/80 py-1 font-mono text-xs" style={{ paddingLeft: depth * 14 }}>
        {topic.name}
      </p>
      {topic.hasChildren && (
        <ul className="m-0 list-none p-0">
          {topic.children.map((child) => (
            <TopicRow key={child.slug} topic={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

// Two columns, Khan Academy style: a fixed left list of categories, and a
// right pane — its own header plus a scrollable topic list — that swaps to
// whichever category is selected on the left. Not the same job as
// CategorySpinner: this is direct lookup for someone who already knows what
// they want. See docs/DECISIONS.md.
export function CategoryTreeNav({ data }: CategoryTreeNavProps) {
  const [open, setOpen] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(data[0]?.categorySlug ?? null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [open])

  const selected = data.find((entry) => entry.categorySlug === selectedSlug) ?? data[0] ?? null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
      >
        Browse {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="bg-surface border-line absolute top-full left-0 z-10 mt-2 flex w-[26rem] overflow-hidden rounded-lg border shadow-lg">
          <ul className="border-line m-0 w-40 shrink-0 list-none space-y-0.5 border-r p-2">
            {data.map(({ categorySlug, categoryName, categoryColor }) => {
              const isSelected = categorySlug === selected?.categorySlug
              return (
                <li key={categorySlug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(categorySlug)}
                    className="w-full rounded px-2 py-1.5 text-left font-mono text-xs transition-colors"
                    style={{
                      color: categoryColor,
                      backgroundColor: isSelected ? 'var(--color-paper)' : 'transparent',
                    }}
                  >
                    {categoryName}
                  </button>
                </li>
              )
            })}
          </ul>

          {selected && (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="border-line border-b px-3 py-2">
                <span
                  className="font-mono text-[11px] tracking-wide uppercase"
                  style={{ color: selected.categoryColor }}
                >
                  {selected.categoryName}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto p-2">
                {selected.topics.length === 0 ? (
                  <p className="text-ink-muted px-1 py-1 font-mono text-xs">No topics yet.</p>
                ) : (
                  <ul className="m-0 list-none space-y-0.5 p-0">
                    {selected.topics.map((topic) => (
                      <TopicRow key={topic.slug} topic={topic} depth={0} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
