const API_BASE = '/api/v1'

interface ErrorEnvelope {
  error: string
  message: string
  details: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function readErrorMessage(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as ErrorEnvelope
    return { code: body.error ?? 'unknown', message: body.message ?? response.statusText }
  } catch {
    return { code: 'unknown', message: response.statusText }
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    const { code, message } = await readErrorMessage(response)
    throw new ApiError(response.status, code, message)
  }
  return (await response.json()) as T
}
