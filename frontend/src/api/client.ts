import type { z } from 'zod'
import {
  AccountListSchema,
  ApiErrorBodySchema,
  ProviderListSchema,
  SubmissionRejectedSchema,
  SubmissionResultSchema,
  type AddProvidersRequest,
  type SubmissionProblem,
  type UploadStatementRequest,
} from './schemas'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** The server refused the submission and told us exactly what is still wrong. */
export class SubmissionRejectedError extends ApiError {
  constructor(
    message: string,
    readonly problems: SubmissionProblem[],
  ) {
    super(message, 422)
    this.name = 'SubmissionRejectedError'
  }
}

/** Absolute URL for an API path. Absolute URLs from the server (e.g. `fileUrl`) pass through. */
export function apiUrl(path: string): string {
  const full = /^https?:/.test(path) ? path : BASE_URL + path
  // Relative base works in the browser; jsdom/Node needs an absolute URL.
  return new URL(full, globalThis.location?.origin).toString()
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null)
  if (res.status === 422) {
    const rejected = SubmissionRejectedSchema.safeParse(body)
    if (rejected.success) return new SubmissionRejectedError(rejected.data.message, rejected.data.problems)
  }
  const parsed = ApiErrorBodySchema.safeParse(body)
  if (parsed.success) return new ApiError(parsed.data.message, res.status)
  return new ApiError(`Request failed (${res.status})`, res.status)
}

/** Fetches and turns network failures and error statuses into `ApiError`s. */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(apiUrl(path), init)
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!res.ok) throw await toApiError(res)
  return res
}

async function request<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<z.infer<S>> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // JSON bodies are strings; FormData sets its own multipart boundary; a GET sends none (no CORS preflight).
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await send(path, { ...init, headers })
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiError('Unexpected response from the server.', res.status)
  return parsed.data
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
})

export const api = {
  getKnownProviders: () => request('/api/providers', ProviderListSchema),
  getAccounts: () => request('/api/accounts', AccountListSchema),
  addProviders: (req: AddProvidersRequest) => request('/api/accounts', AccountListSchema, json('POST', req)),
  removeAccount: (accountId: string) =>
    request(`/api/accounts/${encodeURIComponent(accountId)}`, AccountListSchema, json('DELETE')),
  uploadStatement: (accountId: string, { file, statementDate }: UploadStatementRequest) => {
    const body = new FormData()
    body.append('file', file)
    body.append('statementDate', statementDate)
    return request(`/api/accounts/${encodeURIComponent(accountId)}/statement`, AccountListSchema, { method: 'PUT', body })
  },
  /** The uploaded file itself, fetched through the API so it gets the same auth and error handling. */
  getStatementFile: async (fileUrl: string) => (await send(fileUrl)).blob(),
  submit: () => request('/api/submission', SubmissionResultSchema, json('POST')),
}
