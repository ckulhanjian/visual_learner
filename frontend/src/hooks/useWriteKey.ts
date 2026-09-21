import { useEffect, useState } from 'react'

const STORAGE_KEY = 'atlas-write-key'

// Persisted the same way the theme choice is (`theme/useTheme.ts`) — this is
// a single-operator personal site, so remembering the key locally avoids
// retyping it for every visual added in one seeding session. Never sent
// anywhere but this site's own API (`X-Atlas-Key`, see `api/client.ts`).
export function useWriteKey() {
  const [writeKey, setWriteKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')

  useEffect(() => {
    if (writeKey) {
      localStorage.setItem(STORAGE_KEY, writeKey)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [writeKey])

  return [writeKey, setWriteKey] as const
}
