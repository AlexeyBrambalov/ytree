import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountsScreen } from './components/AccountsScreen'
import { ToastProvider } from './components/ToastProvider'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AccountsScreen />
      </ToastProvider>
    </QueryClientProvider>
  )
}
