import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking() {
  // Until the Kotlin service exists, MSW plays the backend. Set VITE_API_BASE_URL to use a real one.
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
