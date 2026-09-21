import { useState, type FormEvent, type ReactNode } from 'react'
import { apiUpload, ApiError } from '../api/client'
import type { Meta } from '../api/meta'
import { createVisual, type NewResourceDraft, type NewVisualDraft } from '../api/visuals'
import type { Category } from '../domain/Category'
import type { VisualDetail } from '../domain/Visual'

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

const inputClass =
  'bg-surface border-line text-ink w-full rounded border px-2 py-1.5 font-mono text-sm focus:outline-none'
const labelClass = 'text-ink-muted mb-1 block font-mono text-[11px] tracking-wide uppercase'

function fieldName(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_')
}

interface FieldProps {
  label: string
  children: ReactNode
  error?: string[]
  hint?: string
}

function Field({ label, children, error, hint }: FieldProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={fieldName(label)}>
        {label}
      </label>
      {children}
      {hint && <p className="text-ink-muted mt-1 font-mono text-[11px]">{hint}</p>}
      {error && error.length > 0 && <p className="mt-1 font-mono text-[11px] text-red-700 dark:text-red-400">{error.join(' ')}</p>}
    </div>
  )
}

// One component owning every metadata field, per docs/ARCHITECTURE.md §6 —
// mounted by /submit now and, later, /create; both would POST the same
// payload shape to the same endpoint. Not aware of the write key: that's an
// auth concern of the *submission action*, not a field on the visual
// itself, so SubmitPage owns it and just hands the value down.
export function ConceptForm({ categories, meta, writeKey }: ConceptFormProps) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState(meta.visualKinds[0] ?? '')
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? '')
  const [tagsInput, setTagsInput] = useState('')
  const [summaryMd, setSummaryMd] = useState('')
  const [notesMd, setNotesMd] = useState('')
  const [themeAffinity, setThemeAffinity] = useState(meta.themeAffinities[0] ?? 'adaptive')
  const [origin, setOrigin] = useState(meta.origins[0] ?? 'human')
  const [generator, setGenerator] = useState('')
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

  // Keeps category/kind/theme/origin/context — a seeding session is usually
  // several visuals of the same kind going into the same category, so
  // re-picking those for every single one would be pure friction. Clears
  // everything that's genuinely per-visual.
  function resetForNextVisual() {
    setTitle('')
    setTagsInput('')
    setSummaryMd('')
    setNotesMd('')
    setGenerator('')
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

      const draft: NewVisualDraft = {
        title,
        kind,
        source: kind === 'image' ? '' : source,
        assetPath,
        themeAffinity,
        origin,
        generator,
        createdOn,
        context,
        course,
        summaryMd,
        notesMd,
        categorySlug,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
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
        <div className="border-line bg-surface rounded border p-3 font-mono text-xs">
          <span className="text-ink">Created "{lastCreated.title}"</span>
          {' — '}
          <a href={`/v/${lastCreated.slug}`} className="text-ink underline underline-offset-2">
            view it
          </a>
          {writeKey ? '' : ' (queued as pending — no write key was sent).'}
        </div>
      )}

      {errorMessage && (
        <p className="font-mono text-xs text-red-700 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" error={fieldErrors.title}>
          <input
            id={fieldName('Title')}
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>

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
          <select id={fieldName('Kind')} className={inputClass} value={kind} onChange={(event) => setKind(event.target.value)}>
            {meta.visualKinds.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags" hint="comma-separated — new ones are created on the fly">
          <input
            id={fieldName('Tags')}
            className={inputClass}
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
        </Field>
      </div>

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
        <Field label="Source" error={fieldErrors.source} hint="markup, code, or a JSON spec, depending on kind">
          <textarea
            id={fieldName('Source')}
            className={`${inputClass} h-40 resize-y`}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={SOURCE_PLACEHOLDER[kind] ?? ''}
          />
        </Field>
      )}

      <Field label="Summary" error={fieldErrors.summary_md} hint="one line, shown on grid cards">
        <input
          id={fieldName('Summary')}
          className={inputClass}
          value={summaryMd}
          onChange={(event) => setSummaryMd(event.target.value)}
        />
      </Field>

      <Field label="Notes" error={fieldErrors.notes_md} hint="Markdown, with $inline$ or $$block$$ LaTeX">
        <textarea
          id={fieldName('Notes')}
          className={`${inputClass} h-32 resize-y`}
          value={notesMd}
          onChange={(event) => setNotesMd(event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Field label="Theme affinity" error={fieldErrors.theme_affinity}>
          <select
            id={fieldName('Theme affinity')}
            className={inputClass}
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

        <Field label="Origin" error={fieldErrors.origin}>
          <select id={fieldName('Origin')} className={inputClass} value={origin} onChange={(event) => setOrigin(event.target.value)}>
            {meta.origins.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Context" error={fieldErrors.context}>
          <select
            id={fieldName('Context')}
            className={inputClass}
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

        <Field label="Made on" error={fieldErrors.created_on} hint="when it was made, not today">
          <input
            id={fieldName('Made on')}
            type="date"
            className={inputClass}
            value={createdOn}
            onChange={(event) => setCreatedOn(event.target.value)}
          />
        </Field>

        <Field label="Generator" error={fieldErrors.generator} hint='e.g. "Claude Opus 5" — only if machine/hybrid'>
          <input
            id={fieldName('Generator')}
            className={inputClass}
            value={generator}
            onChange={(event) => setGenerator(event.target.value)}
          />
        </Field>

        <Field label="Course" error={fieldErrors.course} hint='e.g. "PHY 2048" — only if context is class'>
          <input id={fieldName('Course')} className={inputClass} value={course} onChange={(event) => setCourse(event.target.value)} />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={labelClass}>Resources</span>
          <button type="button" onClick={addResource} className="text-ink-muted hover:text-ink font-mono text-[11px] uppercase">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {resources.map((resource, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
              <input
                className={inputClass}
                placeholder="Label"
                value={resource.label}
                onChange={(event) => updateResource(index, { label: event.target.value })}
              />
              <input
                className={inputClass}
                placeholder="https://..."
                value={resource.url}
                onChange={(event) => updateResource(index, { url: event.target.value })}
              />
              <select
                className={inputClass}
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
                className="text-ink-muted hover:text-ink font-mono text-[11px] uppercase"
              >
                Remove
              </button>
            </div>
          ))}
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
