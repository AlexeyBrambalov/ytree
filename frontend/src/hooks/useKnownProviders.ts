import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'

/** The catalogue of providers rarely changes, so it is fetched once per session. */
export function useKnownProviders() {
  return useQuery({ queryKey: queryKeys.knownProviders, queryFn: api.getKnownProviders, staleTime: Infinity })
}
