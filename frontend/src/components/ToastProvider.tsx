import type { ReactNode } from 'react'
import { QA } from '../helpers/qa'
import { ToastContext, type ToastTone } from '../hooks/toastContext'
import { useToastQueue } from '../hooks/useToastQueue'

const TOAST_TONE: Record<ToastTone, string> = {
  success: 'bg-navy-900 text-white',
  error: 'bg-bad-600 text-white',
  info: 'bg-white text-navy-900 ring-1 ring-line',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, notify } = useToastQueue()

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} data-qa={QA.toast} className={`rounded-full px-5 py-2.5 text-sm font-medium shadow-lg ${TOAST_TONE[t.tone]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
