import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

export const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null)
