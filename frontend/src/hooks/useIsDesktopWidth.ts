import { useEffect, useState } from 'react'

// Tailwind's `lg` breakpoint (1024px) as a JS-readable condition — shared by
// anything whose behavior, not just its styling, differs there (a media
// query alone can't gate event listeners or measurement effects).
const DESKTOP_QUERY = '(min-width: 1024px)'

export function useIsDesktopWidth(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const handleChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}
