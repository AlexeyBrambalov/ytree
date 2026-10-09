import { useCallback, useEffect, useRef, useState } from 'react'
import type { Toast, ToastTone } from './toastContext'

export const TOAST_DURATION_MS = 4000

export function useToastQueue() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, tone, message }])
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setToasts((t) => t.filter((x) => x.id !== id))
    }, TOAST_DURATION_MS)
    timers.current.add(timer)
  }, [])

  return { toasts, notify }
}
