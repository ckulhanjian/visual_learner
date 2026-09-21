const API_BASE = '/api/v1'

interface ErrorEnvelope {
  error: string
  message: string
  details: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  // Marshmallow's own validation errors land here field-by-field (e.g.
  // { title: ["Length must be..."] }) — ConceptForm reads this to show
  // per-field messages instead of just the one summary line.
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function readErrorMessage(
  response: Response,
): Promise<{ code: string; message: string; details: Record<string, unknown> }> {
  try {
    const body = (await response.json()) as ErrorEnvelope
    return { code: body.error ?? 'unknown', message: body.message ?? response.statusText, details: body.details ?? {} }
  } catch {
    return { code: 'unknown', message: response.statusText, details: {} }
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    const { code, message, details } = await readErrorMessage(response)
    throw new ApiError(response.status, code, message, details)
  }
  return (await response.json()) as T
}

// `writeKey` is optional everywhere it's accepted — most POSTs on this site
// work anonymously (docs/ARCHITECTURE.md's write-protection layers), landing
// as `pending` rather than being rejected. Sent as `X-Atlas-Key` only when
// non-empty, matching `is_trusted_request()`'s own "unset means untrusted"
// rule (CLAUDE.md security invariant #4) — an empty header would fail that
// check anyway, but not sending it at all is the honest request shape.
export async function apiPost<T>(path: string, body: unknown, writeKey?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (writeKey) headers['X-Atlas-Key'] = writeKey
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!response.ok) {
    const { code, message, details } = await readErrorMessage(response)
    throw new ApiError(response.status, code, message, details)
  }
  return (await response.json()) as T
}

export async function apiUpload(path: string, file: File, writeKey?: string): Promise<{ assetPath: string }> {
  const headers: Record<string, string> = {}
  if (writeKey) headers['X-Atlas-Key'] = writeKey
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData })
  if (!response.ok) {
    const { code, message, details } = await readErrorMessage(response)
    throw new ApiError(response.status, code, message, details)
  }
  const dto = (await response.json()) as { asset_path: string }
  return { assetPath: dto.asset_path }
}
