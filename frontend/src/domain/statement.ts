export const STATEMENT_STATUSES = ['MISSING', 'UPLOADED', 'OUTDATED'] as const
export type StatementStatus = (typeof STATEMENT_STATUSES)[number]

/** A statement older than this no longer counts. */
export const MAX_STATEMENT_AGE_MONTHS = 3

/** Statement files: what the upload accepts, checked by the client to guide and by the server to enforce. */
export const STATEMENT_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const
export const MAX_STATEMENT_FILE_MB = 10

export function isAcceptedStatementFile(file: { name: string }): boolean {
  const name = file.name.toLowerCase()
  return STATEMENT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function isWithinStatementSizeLimit(file: { size: number }): boolean {
  return file.size <= MAX_STATEMENT_FILE_MB * 1024 * 1024
}

/** Calendar-month subtraction in UTC, clamping to the last day of shorter months. */
export function subtractMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() - months
  const lastDayOfTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDayOfTarget)))
}

/** `YYYY-MM-DD` in UTC. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** `YYYY-MM-DD` of the viewer's own calendar day, which is what "today" means in a form. */
export function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Status rules. The backend is the source of truth for status; this mirrors it so the
 * mock API (and later the Kotlin service) apply the same rule.
 */
export function getStatementStatus(
  statement: { statementDate: string } | null,
  today: Date,
): StatementStatus {
  if (!statement) return 'MISSING'
  const cutoff = isoDate(subtractMonths(today, MAX_STATEMENT_AGE_MONTHS))
  // ISO dates compare correctly as strings.
  return statement.statementDate < cutoff ? 'OUTDATED' : 'UPLOADED'
}
