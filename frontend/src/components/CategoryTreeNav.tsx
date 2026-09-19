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
  const [expanded, setExpanded] = useState(false)
  const hasChildren = topic.hasChildren

  return (
    <li>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((current) => !current)}
        className="text-ink/80 hover:text-ink flex w-full items-center gap-1.5 py-1 text-left font-mono text-xs"
        style={{ paddingLeft: depth * 14 }}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <span className="w-3 text-center">{hasChildren ? (expanded ? '−' : '+') : '·'}</span>
        {topic.name}
      </button>
      {hasChildren && expanded && (
        <ul className="m-0 list-none p-0">
          {topic.children.map((child) => (
            <TopicRow key={child.slug} topic={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

// Direct lookup for someone who already knows what they want — separate job
// from CategorySpinner, which is for browsing. See docs/DECISIONS.md.
export function CategoryTreeNav({ data }: CategoryTreeNavProps) {
  const [open, setOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
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
        <div className="bg-surface border-line absolute top-full left-0 z-10 mt-2 w-64 rounded-lg border p-2 shadow-lg">
          <ul className="m-0 list-none space-y-0.5 p-0">
            {data.map(({ categorySlug, categoryName, categoryColor, topics }) => {
              const hasTopics = topics.length > 0
              const isExpanded = expandedCategory === categorySlug
              return (
                <li key={categorySlug}>
                  <button
                    type="button"
                    onClick={() => hasTopics && setExpandedCategory(isExpanded ? null : categorySlug)}
                    className="flex w-full items-center gap-1.5 py-1 text-left font-mono text-xs"
                    aria-expanded={hasTopics ? isExpanded : undefined}
                  >
                    <span className="w-3 text-center">{hasTopics ? (isExpanded ? '−' : '+') : '·'}</span>
                    <span style={{ color: categoryColor }}>{categoryName}</span>
                  </button>
                  {hasTopics && isExpanded && (
                    <ul className="m-0 list-none p-0">
                      {topics.map((topic) => (
                        <TopicRow key={topic.slug} topic={topic} depth={1} />
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
