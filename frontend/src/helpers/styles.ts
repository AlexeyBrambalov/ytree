import type { StatementStatus } from '../domain/statement'

/** Tailwind class maps shared by components, keyed by design-system variant. */

export const STATUS_TONE: Record<StatementStatus, string> = {
  UPLOADED: 'bg-ok-50 text-ok-600',
  MISSING: 'bg-bad-50 text-bad-600',
  OUTDATED: 'bg-warn-50 text-warn-600',
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-700 disabled:bg-navy-300',
  secondary: 'bg-white text-navy-900 ring-1 ring-inset ring-line hover:ring-navy-300 disabled:text-navy-300',
  ghost: 'text-muted hover:bg-navy-50 hover:text-navy-900 disabled:text-navy-300',
  danger: 'bg-bad-600 text-white hover:brightness-110',
}

export const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-control',
  md: 'px-6 py-2.5 text-sm',
}

export const FILTER_CHIP = {
  active: { chip: 'bg-navy-900 text-white', count: 'text-cyan-100' },
  inactive: { chip: 'bg-white text-muted ring-1 ring-line ring-inset hover:text-navy-900', count: 'text-navy-300' },
}
