const REPO_URL = 'https://github.com/ckulhanjian/visual_learner'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-ink-muted font-body max-w-md text-xs italic">Achk (աչք) is the Armenian word for &ldquo;eye.&rdquo;</p>
      <div className="text-ink-muted flex items-center gap-3 font-mono text-xs">
        <span>&copy; {year} Achk</span>
        <span aria-hidden="true">&middot;</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
          GitHub
        </a>
      </div>
    </div>
  )
}
