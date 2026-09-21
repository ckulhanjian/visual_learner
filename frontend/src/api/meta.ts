import { apiGet } from './client'

interface MetaDTO {
  visual_kinds: string[]
  theme_affinities: string[]
  origins: string[]
  contexts: string[]
  statuses: string[]
  resource_kinds: string[]
}

// The controlled vocabularies, straight from `app/models/enums.py`
// (docs/ARCHITECTURE.md §3) — ConceptForm builds every dropdown from this
// response so it can never offer a value the backend would reject. "One
// definition per concept" (CLAUDE.md): nothing here is hardcoded in React.
export interface Meta {
  visualKinds: string[]
  themeAffinities: string[]
  origins: string[]
  contexts: string[]
  statuses: string[]
  resourceKinds: string[]
}

export async function fetchMeta(): Promise<Meta> {
  const dto = await apiGet<MetaDTO>('/meta')
  return {
    visualKinds: dto.visual_kinds,
    themeAffinities: dto.theme_affinities,
    origins: dto.origins,
    contexts: dto.contexts,
    statuses: dto.statuses,
    resourceKinds: dto.resource_kinds,
  }
}
