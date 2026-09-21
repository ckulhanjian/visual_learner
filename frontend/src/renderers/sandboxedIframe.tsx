import { buildDocument } from './sandboxedDocument'

interface SandboxedIframeRendererProps {
  kind: string
  source: string
}

// Code-bearing kinds render in `<iframe sandbox="allow-scripts">` — never
// with `allow-same-origin` (CLAUDE.md security invariant #1). That
// combination makes the browser treat the frame as an opaque foreign
// origin: pasted model output can't reach the page's DOM, storage, or API
// no matter what it does. `needs_sandbox` is computed server-side and
// already true for exactly these kinds by the time this renders — this
// component doesn't re-decide it, just applies it.
export function SandboxedIframeRenderer({ kind, source }: SandboxedIframeRendererProps) {
  return (
    <iframe
      title="visual"
      srcDoc={buildDocument(kind, source)}
      sandbox="allow-scripts"
      className="h-full w-full border-0"
    />
  )
}
