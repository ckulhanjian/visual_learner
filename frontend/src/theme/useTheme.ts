import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'atlas-theme'

// Dark first — see docs/DECISIONS.md #5.3 (supersedes the earlier "paper
// cream first" decision).
const DEFAULT_THEME: Theme = 'dark'

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  // Distinguish "nothing stored yet" from an explicit stored choice — with
  // the old light-first default this collapsed into the same branch by
  // coincidence, but flipping the default exposed it: any stored value that
  // wasn't literally 'dark' (including an explicit 'light') would otherwise
  // have silently fallen through to DEFAULT_THEME.
  return stored === 'dark' || stored === 'light' ? stored : DEFAULT_THEME
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggleTheme }
}
