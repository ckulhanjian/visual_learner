interface ImageRendererProps {
  assetPath: string | null
  title: string
}

// `asset_path` is only ever missing on a malformed row — the service layer
// requires it for an image-kind visual before the row can exist at all
// (docs/ARCHITECTURE.md §5) — so this is a defensive fallback, not a real
// state the form of this app produces.
export function ImageRenderer({ assetPath, title }: ImageRendererProps) {
  if (!assetPath) {
    return <p className="text-ink-muted font-mono text-xs uppercase">Missing image.</p>
  }
  return <img src={assetPath} alt={title} className="h-full w-full object-contain" />
}
