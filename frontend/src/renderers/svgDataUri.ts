// A standalone SVG document — which is what an <img src="data:..."> loads —
// needs its own xmlns declaration. SVG inlined directly into an HTML page
// doesn't, since the HTML parser supplies the namespace; a data URI is
// parsed as its own document, and silently fails to decode without one.
// Hand-typed or pasted SVG snippets routinely omit it, so this can't just be
// fixed in seed data — it has to hold for anything a visitor submits too.
// A plain function, not exported alongside SvgRenderer itself — a file
// mixing components and other exports breaks Fast Refresh.
export function toSvgDataUri(source: string): string {
  const withNamespace = source.includes('xmlns=')
    ? source
    : source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return `data:image/svg+xml,${encodeURIComponent(withNamespace)}`
}
