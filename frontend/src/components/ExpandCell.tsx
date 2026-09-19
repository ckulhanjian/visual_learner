interface ExpandCellProps {
  categoryColor: string
}

// The 4th cell in the preview grid — stubbed, since /c/:slug isn't built yet
// (see docs/DECISIONS.md). Disabled rather than a dead link.
export function ExpandCell({ categoryColor }: ExpandCellProps) {
  return (
    <li>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Category pages aren't built yet"
        className="border-line text-ink-muted flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed font-mono text-xs opacity-60"
      >
        <span className="text-xl leading-none" style={{ color: categoryColor }}>
          +
        </span>
        Expand
      </button>
    </li>
  )
}
