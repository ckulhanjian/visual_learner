interface SandboxedIframeRendererProps {
  kind: string
  source: string
}

// `d3`/`p5` sources are a bare script expecting the library already loaded;
// `html` sources are already a full document and need no CDN script at all.
const CDN_SCRIPTS: Record<string, string> = {
  d3: 'https://cdn.jsdelivr.net/npm/d3@7',
  p5: 'https://cdn.jsdelivr.net/npm/p5@1/lib/p5.min.js',
}

function buildDocument(kind: string, source: string): string {
  if (kind === 'html') return source
  const cdnScript = CDN_SCRIPTS[kind]
  const scriptTag = cdnScript ? `<script src="${cdnScript}"></script>` : ''
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0">${scriptTag}<script>${source}</script></body></html>`
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
