import { useId } from 'react'

interface Props {
  /** The icon's own name, e.g. "Why is this outdated?". */
  label: string
  /** The explanation, shown on hover or keyboard focus and read as the icon's description. */
  text: string
  className?: string
  /** `data-qa` tag. */
  qa?: string
}

/** A small "!" icon that explains itself on hover or focus. */
export function InfoTip({ label, text, className = '', qa }: Props) {
  const tipId = useId()

  return (
    <span data-qa={qa} className={`group relative flex ${className}`}>
      {/* Digits have no descenders, so they sit ~1px above the line's centre; lift the icon to match. */}
      <button type="button" aria-label={label} aria-describedby={tipId} className="flex -translate-y-px rounded-full">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.75" />
          <path d="M8 4.75v3.75" />
          <circle cx="8" cy="11.1" r="0.4" fill="currentColor" />
        </svg>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg bg-navy-900 w-max max-w-56 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
