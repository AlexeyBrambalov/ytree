import type { ReactNode } from 'react'
import { useModal } from '../../hooks/useModal'

interface Props {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, description, onClose, children, footer }: Props) {
  const { titleId, panelRef, onBackdropMouseDown } = useModal(onClose)

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy-900/40 p-0 sm:items-center sm:p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-dialog w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="px-6 pt-6 pb-3">
          <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
