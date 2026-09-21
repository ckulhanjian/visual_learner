import { useState, type FormEvent, type ReactNode } from 'react'
import { apiUpload, ApiError } from '../api/client'
import type { Meta } from '../api/meta'
import { createVisual, type NewResourceDraft, type NewVisualDraft } from '../api/visuals'
import type { Category } from '../domain/Category'
import type { VisualDetail } from '../domain/Visual'
import { useTheme } from '../theme/useTheme'
import { MarkdownBody } from './MarkdownBody'

interface ConceptFormProps {
  categories: Category[]
  meta: Meta
  writeKey: string
}

// Placeholder text for the source textarea, one per code-shaped kind —
// `image` has no textarea at all (a file input instead), so it's not here.
const SOURCE_PLACEHOLDER: Record<string, string> = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>',
  chartjs: '{\n  "type": "bar",\n  "data": { ... },\n  "options": { ... }\n}',
  d3: '// assumes d3 is already loaded — see docs/DECISIONS.md\nconst svg = d3.select("body").append("svg")...',
  html: '<!doctype html>\n<html>...</html>',
  p5: '// assumes p5 is already loaded\nfunction setup() { createCanvas(400, 400) }\nfunction draw() { ... }',
}

// What file picker to offer per code-shaped kind, so "upload a file" picks
// a sensible extension instead of accepting anything.
const SOURCE_FILE_ACCEPT: Record<string, string> = {
  svg: '.svg,image/svg+xml',
  chartjs: '.json,application/json',
  d3: '.js,text/javascript',
  html: '.html,.htm,text/html',
  p5: '.js,text/javascript',
}

const inputClass =
  'bg-surface border-line text-ink w-full rounded border px-2 py-1.5 font-mono text-sm focus:outline-none'
const labelClass = 'text-ink-muted mb-1 block font-mono text-[11px] tracking-wide uppercase'
const smallInputClass =
  'bg-surface border-line text-ink w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none'
const smallLabelClass = 'text-ink-muted mb-1 block font-mono text-[10px] tracking-wide uppercase'

function fieldName(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_')
}

interface FieldProps {
  label: string
  children: ReactNode
  error?: string[]
  hint?: string
  small?: boolean
}

function Field({ label, children, error, hint, small }: FieldProps) {
  return (
    <div>
      <label className={small ? smallLabelClass : labelClass} htmlFor={fieldName(label)}>
        {label}
      </label>
      {children}
      {hint && <p className="text-ink-muted mt-1 font-mono text-[11px]">{hint}</p>}
      {error && error.length > 0 && (
        <p className="mt-1 font-mono text-[11px] text-red-700 dark:text-red-400">{error.join(' ')}</p>
      )}
    </div>
  )
}

// One component owning every metadata field, per docs/ARCHITECTURE.md §6 —
// mounted by /submit now and, later, /create; both would POST the same
// payload shape to the same endpoint. Not aware of the write key: that's an
// auth concern of the *submission action*, not a field on the visual
// itself, so SubmitPage owns it and just hands the value down.
//
// Layout, per feedback: title full width, then a two-column split right
// below it — authorship/description metadata on the left, the kind-specific
// source on the right (feedback called these "auth" and "source") — then
// notes full width (with a live Markdown/LaTeX preview alongside the raw
// textarea), then everything else grouped under a smaller "Optional"
// section. The field order and the optional/required split were both
// explicit feedback, not a guess at what "usually matters."
export function ConceptForm({ categories, meta, writeKey }: ConceptFormProps) {
  const { theme } = useTheme()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState(meta.visualKinds[0] ?? '')
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? '')
  const [summaryMd, setSummaryMd] = useState('')
  const [notesMd, setNotesMd] = useState('')
  const [themeAffinity, setThemeAffinity] = useState(meta.themeAffinities[0] ?? 'adaptive')
  // Free text, not the raw `origin` enum select it replaced — see
  // docs/DECISIONS.md. Blank means "made by hand" (origin: human); anything
  // typed here is who/what made it (origin: machine, generator: this text).
  // `hybrid` (machine-made, hand-edited) isn't reachable from this box; the
  // API still accepts it, this form just doesn't offer it any more.
  const [author, setAuthor] = useState('')
  const [createdOn, setCreatedOn] = useState('')
  const [context, setContext] = useState(meta.contexts[0] ?? 'personal')
  const [course, setCourse] = useState('')
  const [source, setSource] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [resources, setResources] = useState<NewResourceDraft[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [lastCreated, setLastCreated] = useState<VisualDetail | null>(null)

  function addResource() {
    setResources((current) => [...current, { label: '', url: '', kind: meta.resourceKinds[0] ?? 'other' }])
  }

  function updateResource(index: number, patch: Partial<NewResourceDraft>) {
    setResources((current) => current.map((resource, i) => (i === index ? { ...resource, ...patch } : resource)))
  }

  function removeResource(index: number) {
    setResources((current) => current.filter((_, i) => i !== index))
  }

  // "Upload" for code-bearing kinds isn't a real upload — there's no server
  // endpoint for pasted code, on purpose (docs/ARCHITECTURE.md's write
  // protection layers are built around POST /visuals taking source as JSON
  // text). This just reads the chosen file's text into `source` and drops
  // the File object; nothing about the file itself ever leaves the browser
  // or reaches the network.
  async function handleSourceFile(file: File | null) {
    if (!file) return
    setSource(await file.text())
  }

  // Keeps category/kind/theme affinity/context — a seeding session is
  // usually several visuals of the same kind going into the same category,
  // so re-picking those for every single one would be pure friction. Clears
  // everything that's genuinely per-visual.
  function resetForNextVisual() {
    setTitle('')
    setSummaryMd('')
    setNotesMd('')
    setAuthor('')
    setCreatedOn('')
    setCourse('')
    setSource('')
    setImageFile(null)
    setResources([])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})
    setLastCreated(null)

    try {
      let assetPath: string | null = null
      if (kind === 'image') {
        if (!imageFile) {
          setErrorMessage('Choose an image file first.')
          setSubmitting(false)
          return
        }
        const uploaded = await apiUpload('/uploads', imageFile, writeKey || undefined)
        assetPath = uploaded.assetPath
      }

      const trimmedAuthor = author.trim()
      const draft: NewVisualDraft = {
        title,
        kind,
        source: kind === 'image' ? '' : source,
        assetPath,
        themeAffinity,
        origin: trimmedAuthor ? 'machine' : 'human',
        generator: trimmedAuthor,
        createdOn,
        context,
        course,
        summaryMd,
        notesMd,
        categorySlug,
        tags: [],
        resources,
      }
      const created = await createVisual(draft, writeKey || undefined)
      setLastCreated(created)
      resetForNextVisual()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
        setFieldErrors(error.details as Record<string, string[]>)
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {lastCreated && (
        <div className="border-line bg-surface rounded border p-4 font-mono text-sm">
          {lastCreated.status === 'published' ? (
            <>
              Thank you for submitting!{' '}
              <a href={`/v/${lastCreated.slug}`} className="text-ink underline underline-offset-2">
                View your visual here
              </a>
            </>
          ) : (
            'Thank you for submitting! Your visual will be approved soon.'
          )}
        </div>
      )}

      {errorMessage && <p className="font-mono text-xs text-red-700 dark:text-red-400">{errorMessage}</p>}

      {/* Short on purpose — a display name, not a description. That's what
          Summary below is for. */}
      <Field label="Title" error={fieldErrors.title} hint="short — a name, not a description">
        <input
          id={fieldName('Title')}
          className={`${inputClass} max-w-lg text-base`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: everything about what the visual is and who/when made it. */}
        <div className="space-y-4">
          <Field
            label="Summary"
            error={fieldErrors.summary_md}
            hint="as long as it needs to be — shown on grid cards and the visual's own page"
          >
            <textarea
              id={fieldName('Summary')}
              className={`${inputClass} min-h-[84px] resize-y`}
              value={summaryMd}
              onChange={(event) => setSummaryMd(event.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Category" error={fieldErrors.category_slug}>
              <select
                id={fieldName('Category')}
                className={inputClass}
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                required
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kind" error={fieldErrors.kind}>
              <select
                id={fieldName('Kind')}
                className={inputClass}
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {meta.visualKinds.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Author"
            error={fieldErrors.generator}
            hint='who/what made it — leave blank for "hand-authored," or type e.g. "Claude Opus 5"'
          >
            <input
              id={fieldName('Author')}
              className={inputClass}
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </Field>
        </div>

        {/* Right: the kind-specific source, matching the left column's height. */}
        <div className="flex flex-col">
          {kind === 'image' ? (
            <Field label="Image file" error={fieldErrors.asset_path}>
              <input
                id={fieldName('Image file')}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                className="text-ink font-mono text-sm"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </Field>
          ) : (
            <div className="flex h-full flex-col">
              <div className="mb-1 flex items-center justify-between">
                <label className={labelClass} htmlFor={fieldName('Source')}>
                  Source
                </label>
                <label className="border-line text-ink hover:bg-surface cursor-pointer rounded-full border px-2 py-1 font-mono text-[11px] uppercase transition-colors">
                  Upload file
                  <input
                    type="file"
                    accept={SOURCE_FILE_ACCEPT[kind]}
                    className="hidden"
                    onChange={(event) => {
                      void handleSourceFile(event.target.files?.[0] ?? null)
                      // Clears the input so choosing the same file again
                      // (e.g. after editing it and re-exporting) still fires
                      // onChange the next time.
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
              <textarea
                id={fieldName('Source')}
                className={`${inputClass} min-h-[220px] flex-1 resize-none`}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder={SOURCE_PLACEHOLDER[kind] ?? ''}
              />
              <p className="text-ink-muted mt-1 font-mono text-[11px]">
                Uploading reads the file's text in above — the file itself is never sent anywhere.
              </p>
              {fieldErrors.source && fieldErrors.source.length > 0 && (
                <p className="mt-1 font-mono text-[11px] text-red-700 dark:text-red-400">
                  {fieldErrors.source.join(' ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes: full width, raw Markdown next to its own live-rendered
          preview so what it'll actually look like on the visual page is
          never a surprise after submitting. */}
      <div>
        <label className={labelClass} htmlFor={fieldName('Notes')}>
          Notes
        </label>
        <p className="text-ink-muted mb-1 font-mono text-[11px]">Markdown, with $inline$ or $$block$$ LaTeX</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <textarea
            id={fieldName('Notes')}
            className={`${inputClass} h-56 resize-y`}
            value={notesMd}
            onChange={(event) => setNotesMd(event.target.value)}
          />
          <div className="border-line bg-surface h-56 overflow-y-auto rounded border p-3">
            {notesMd ? (
              <MarkdownBody source={notesMd} theme={theme} />
            ) : (
              <p className="text-ink-muted font-mono text-xs">Preview appears here…</p>
            )}
          </div>
        </div>
        {fieldErrors.notes_md && fieldErrors.notes_md.length > 0 && (
          <p className="mt-1 font-mono text-[11px] text-red-700 dark:text-red-400">{fieldErrors.notes_md.join(' ')}</p>
        )}
      </div>

      {/* Optional: everything that isn't required to make a visual real —
          smaller text, visually set apart by the divider above it. */}
      <div className="border-line border-t pt-4">
        <p className="text-ink-muted mb-3 font-mono text-[10px] tracking-wide uppercase">Optional</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Date made" error={fieldErrors.created_on} small>
            <input
              id={fieldName('Date made')}
              type="date"
              className={smallInputClass}
              value={createdOn}
              onChange={(event) => setCreatedOn(event.target.value)}
            />
          </Field>

          <Field label="Theme affinity" error={fieldErrors.theme_affinity} small>
            <select
              id={fieldName('Theme affinity')}
              className={smallInputClass}
              value={themeAffinity}
              onChange={(event) => setThemeAffinity(event.target.value)}
            >
              {meta.themeAffinities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Context" error={fieldErrors.context} small>
            <select
              id={fieldName('Context')}
              className={smallInputClass}
              value={context}
              onChange={(event) => setContext(event.target.value)}
            >
              {meta.contexts.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Course" error={fieldErrors.course} small hint='only if context is "class"'>
            <input
              id={fieldName('Course')}
              className={smallInputClass}
              value={course}
              onChange={(event) => setCourse(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className={smallLabelClass}>Resources</span>
            <button type="button" onClick={addResource} className="text-ink-muted hover:text-ink font-mono text-[10px] uppercase">
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {resources.map((resource, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
                <input
                  className={smallInputClass}
                  placeholder="Label"
                  value={resource.label}
                  onChange={(event) => updateResource(index, { label: event.target.value })}
                />
                <input
                  className={smallInputClass}
                  placeholder="https://..."
                  value={resource.url}
                  onChange={(event) => updateResource(index, { url: event.target.value })}
                />
                <select
                  className={smallInputClass}
                  value={resource.kind}
                  onChange={(event) => updateResource(index, { kind: event.target.value })}
                >
                  {meta.resourceKinds.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeResource(index)}
                  className="text-ink-muted hover:text-ink font-mono text-[10px] uppercase"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="border-line text-ink hover:bg-surface rounded-full border px-4 py-2 font-mono text-xs tracking-wide uppercase transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Create visual'}
      </button>
    </form>
  )
}
