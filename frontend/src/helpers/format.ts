const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** `2026-01-05` → `5 Jan 2026`. Parsed as UTC so the day never shifts with the viewer's timezone. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`))
}

export function pluralize(count: number, singular: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${singular}s`
}
