import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import type { Theme } from '../theme/useTheme'

interface MarkdownBodyProps {
  source: string
  theme: Theme
}

// Notes are stored as raw Markdown with inline/block LaTeX
// (docs/ARCHITECTURE.md §7) — remark-math parses the $...$/$$...$$
// delimiters, rehype-katex renders what it finds. `@tailwindcss/typography`
// styles the resulting headings/paragraphs/lists without this component
// hand-rolling that CSS.
//
// `prose-invert` is applied from the `theme` prop, not Tailwind's `dark:`
// variant — this app's dark mode is a manually toggled `data-theme`
// attribute (`useTheme.ts`), independent of `prefers-color-scheme`, so a
// `dark:` class here would silently never fire when the two disagree (the
// same rule `displayColor`/`pastelize` follow, for the same reason).
export function MarkdownBody({ source, theme }: MarkdownBodyProps) {
  return (
    <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
