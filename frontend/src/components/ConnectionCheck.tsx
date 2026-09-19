import { useState } from 'react'
import { fetchHealth } from '../api/health'

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string }

// A dev/testing affordance, not part of docs/ARCHITECTURE.md's page spec —
// lets whoever is running this locally confirm the Vite proxy actually
// reaches Flask without opening a network tab.
export function ConnectionCheck() {
  const [check, setCheck] = useState<CheckState>({ status: 'idle' })

  async function runCheck() {
    setCheck({ status: 'loading' })
    try {
      const health = await fetchHealth()
      setCheck({ status: 'ok', message: `backend says "${health.status}"` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setCheck({ status: 'error', message })
    }
  }

  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      <button
        type="button"
        onClick={runCheck}
        disabled={check.status === 'loading'}
        className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 transition-colors disabled:opacity-50"
      >
        {check.status === 'loading' ? 'Checking…' : 'Test backend connection'}
      </button>
      {check.status === 'ok' && <span className="text-emerald-700 dark:text-emerald-400">{check.message}</span>}
      {check.status === 'error' && (
        <span className="text-red-700 dark:text-red-400">Connection failed: {check.message}</span>
      )}
    </div>
  )
}
