import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking() {
  // MSW plays the backend unless VITE_API_BASE_URL points at the Kotlin service (`pnpm dev:backend`).
  if (import.meta.env.VITE_API_BASE_URL) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

void enableMocking().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
