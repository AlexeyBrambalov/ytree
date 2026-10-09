import { z } from 'zod'
import { PROBLEM_REASONS } from '../domain/readiness'
import {
  isAcceptedStatementFile,
  isWithinStatementSizeLimit,
  MAX_STATEMENT_FILE_MB,
  STATEMENT_STATUSES,
} from '../domain/statement'

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date')

export const ProviderCategorySchema = z.enum(['BANK', 'PENSION', 'INVESTMENT'])
export type ProviderCategory = z.infer<typeof ProviderCategorySchema>

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ProviderCategorySchema,
})
export type Provider = z.infer<typeof ProviderSchema>

export const StatementSchema = z.object({
  fileName: z.string(),
  statementDate: isoDateString,
  /** Where to fetch the uploaded file. The server owns it, so it can move to signed storage URLs later. */
  fileUrl: z.string(),
})
export type Statement = z.infer<typeof StatementSchema>

export const AccountSchema = z.object({
  id: z.string(),
  provider: ProviderSchema,
  statement: StatementSchema.nullable(),
  status: z.enum(STATEMENT_STATUSES),
})
export type Account = z.infer<typeof AccountSchema>

export const AccountListSchema = z.array(AccountSchema)
export const ProviderListSchema = z.array(ProviderSchema)

export const SubmissionProblemSchema = z.object({
  accountId: z.string().nullable(),
  providerName: z.string().nullable(),
  reason: z.enum(PROBLEM_REASONS),
})
export type SubmissionProblem = z.infer<typeof SubmissionProblemSchema>

export const SubmissionRejectedSchema = z.object({
  message: z.string(),
  problems: z.array(SubmissionProblemSchema),
})

export const SubmissionResultSchema = z.object({ submittedAt: z.string() })
export type SubmissionResult = z.infer<typeof SubmissionResultSchema>

export const ApiErrorBodySchema = z.object({ message: z.string() })

// ---- Requests ----

export const AddProvidersRequestSchema = z.object({
  providerIds: z.array(z.string()).min(1, 'Pick at least one provider'),
})
export type AddProvidersRequest = z.infer<typeof AddProvidersRequestSchema>

/**
 * Checked by shape rather than `instanceof File`: the file may come from another realm
 * (an iframe, or the test environment's File next to Node's own).
 */
const isFileLike = (value: unknown): value is File =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as File).name === 'string' &&
  typeof (value as File).size === 'number' &&
  typeof (value as File).slice === 'function'

const StatementFileSchema = z
  .custom<File>(isFileLike, { message: 'Choose a statement file', fatal: true })
  .refine(isAcceptedStatementFile, 'Upload a PDF, PNG or JPEG file')
  .refine(isWithinStatementSizeLimit, `The file must be ${MAX_STATEMENT_FILE_MB} MB or smaller`)

/** `PUT /api/accounts/{id}/statement`, sent as multipart form data. The server validates with this. */
export const UploadStatementRequestSchema = z.object({
  file: StatementFileSchema,
  statementDate: isoDateString,
})
export type UploadStatementRequest = z.infer<typeof UploadStatementRequestSchema>

/** The form's version: relative to "today" so future dates are rejected. */
export const makeUploadStatementSchema = (todayIso: string) =>
  UploadStatementRequestSchema.extend({
    statementDate: isoDateString.refine((d) => d <= todayIso, 'Statement date cannot be in the future'),
  })
