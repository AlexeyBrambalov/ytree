import type { ButtonHTMLAttributes } from 'react'
import { BUTTON_SIZE, BUTTON_VARIANT, type ButtonSize, type ButtonVariant } from '../../helpers/styles'
import { Spinner } from './Spinner'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', loading, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  )
}
