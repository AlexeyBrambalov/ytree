/** Providers the client could still add: not already added, matching the search, sorted by name. */
export function searchAvailableProviders<T extends { id: string; name: string }>(
  providers: readonly T[],
  query: string,
  addedIds: ReadonlySet<string>,
): T[] {
  const q = query.trim().toLowerCase()
  return providers
    .filter((p) => !addedIds.has(p.id) && p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
}
