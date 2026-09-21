const REPO_URL = 'https://github.com/ckulhanjian/visual_learner'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-ink-muted font-body max-w-md text-xs italic">
        Intueri is a Latin verb meaning &ldquo;to look inside,&rdquo; &ldquo;to contemplate,&rdquo; or
        &ldquo;to gaze at,&rdquo; which serves as the etymological root of the English word &ldquo;intuition.&rdquo;
      </p>
      <div className="text-ink-muted flex items-center gap-3 font-mono text-xs">
        <span>&copy; {year} Intueri</span>
        <span aria-hidden="true">&middot;</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
          GitHub
        </a>
      </div>
    </div>
  )
}
