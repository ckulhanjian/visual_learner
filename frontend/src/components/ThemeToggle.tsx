import type { Theme } from '../theme/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="text-ink/70 hover:text-ink hover:border-ink/40 border-line rounded-full border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors"
    >
      {isDark ? 'Dark' : 'Light'}
    </button>
  )
}
