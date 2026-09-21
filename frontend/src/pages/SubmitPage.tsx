import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/categories'
import { fetchMeta, type Meta } from '../api/meta'
import { ConceptForm } from '../components/ConceptForm'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import type { Category } from '../domain/Category'
import type { LoadState } from '../domain/LoadState'
import { useWriteKey } from '../hooks/useWriteKey'
import { useTheme } from '../theme/useTheme'

interface SubmitData {
  categories: Category[]
  meta: Meta
}

// `/submit` — ConceptForm plus everything it needs to exist (categories,
// the controlled vocabularies) and the one thing it deliberately doesn't
// own: the write key, an auth concern of the submission action rather than
// a field on the visual itself (docs/DECISIONS.md).
export function SubmitPage() {
  const { theme, toggleTheme } = useTheme()
  const [state, setState] = useState<LoadState<SubmitData>>({ status: 'loading' })
  const [writeKey, setWriteKey] = useWriteKey()

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategories(), fetchMeta()])
      .then(([categories, meta]) => {
        if (!cancelled) setState({ status: 'ready', data: { categories, meta } })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-body mb-2 text-3xl italic md:text-4xl">Submit</h1>
          <p className="text-ink-muted mb-8 text-sm">
            Anonymous submissions are queued for review. Add your write key below to publish immediately instead.
          </p>

          <div className="mb-8">
            <label htmlFor="write-key" className="text-ink-muted mb-1 block font-mono text-[11px] tracking-wide uppercase">
              Write key
            </label>
            <input
              id="write-key"
              type="password"
              autoComplete="off"
              className="bg-surface border-line text-ink w-full max-w-xs rounded border px-2 py-1.5 font-mono text-sm focus:outline-none"
              value={writeKey}
              onChange={(event) => setWriteKey(event.target.value)}
              placeholder="optional — publishes immediately"
            />
          </div>

          {state.status === 'loading' && <p className="text-ink-muted font-mono text-xs">Loading…</p>}
          {state.status === 'error' && (
            <p className="font-mono text-xs text-red-700 dark:text-red-400">Couldn't load the form: {state.message}</p>
          )}
          {state.status === 'ready' && (
            <ConceptForm categories={state.data.categories} meta={state.data.meta} writeKey={writeKey} />
          )}
        </div>
      </main>

      <footer className="border-line flex justify-center border-t px-6 py-5">
        <SiteFooter />
      </footer>
    </div>
  )
}
