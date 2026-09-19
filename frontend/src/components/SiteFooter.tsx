const REPO_URL = 'https://github.com/ckulhanjian/visual_learner'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <div className="text-ink-muted flex items-center gap-3 font-mono text-xs">
      <span>&copy; {year} Atlas</span>
      <span aria-hidden="true">&middot;</span>
      <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
        GitHub
      </a>
    </div>
  )
}
