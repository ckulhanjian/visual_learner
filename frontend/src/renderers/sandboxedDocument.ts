// `d3`/`p5` sources are a bare script expecting the library already loaded;
// `html` sources are already a full document and need no CDN script at all.
const CDN_SCRIPTS: Record<string, string> = {
  d3: 'https://cdn.jsdelivr.net/npm/d3@7',
  p5: 'https://cdn.jsdelivr.net/npm/p5@1/lib/p5.min.js',
}

// Registers a capture-phase listener before anything else in the document
// runs, so it catches both thrown JS errors and a CDN <script> tag failing
// to load (a resource-load failure doesn't bubble, but it does fire during
// the capture phase at an ancestor — this is why capture is `true`, not the
// default bubble phase). Used only by VisualThumbnail's grid-card preview
// (`reportErrors: true`) to know when to fall back to the ascii cover — the
// full `/v/:slug` render never needs this, an error there just shows broken
// inside the iframe the way any other sandboxed content would.
const PREVIEW_ERROR_SCRIPT =
  "<script>(function(){function r(){try{parent.postMessage({achkPreview:true,ok:false},'*')}catch(e){}}" +
  "window.addEventListener('error',r,true);window.addEventListener('unhandledrejection',r);})();</script>"

// A plain function, not a component — kept out of sandboxedIframe.tsx
// (which exports the SandboxedIframeRenderer component) because mixing a
// component export with a plain function export in one file breaks Fast
// Refresh (oxlint's `only-export-components` rule — the same reasoning
// svgDataUri.ts was split out for, see docs/DECISIONS.md).
export function buildDocument(kind: string, source: string, options?: { reportErrors?: boolean }): string {
  const errorScript = options?.reportErrors ? PREVIEW_ERROR_SCRIPT : ''
  // Prepended directly, not inserted into a `<head>` that may not exist —
  // `html`-kind source is a full pasted document; browsers still parse and
  // execute a `<script>` that appears before an opening `<!doctype html>`,
  // so this reaches the DOM before the rest of the (potentially broken)
  // document does, without needing to understand its structure.
  if (kind === 'html') return errorScript + source
  const cdnScript = CDN_SCRIPTS[kind]
  const scriptTag = cdnScript ? `<script src="${cdnScript}"></script>` : ''
  return `<!doctype html><html><head><meta charset="utf-8" />${errorScript}</head><body style="margin:0">${scriptTag}<script>${source}</script></body></html>`
}
