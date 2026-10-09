import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Modal behaviour: focus inside on open, Escape / backdrop closes, focus returns to the opener. */
export function useModal(onClose: () => void) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Latest onClose without re-running the open/close effect (which would steal focus) when it changes.
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [])

  const onBackdropMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return { titleId, panelRef, onBackdropMouseDown }
}
