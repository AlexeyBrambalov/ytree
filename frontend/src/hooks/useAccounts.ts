import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: api.getAccounts })
}
