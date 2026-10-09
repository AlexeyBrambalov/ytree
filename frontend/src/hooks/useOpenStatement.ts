import { api } from '../api/client'
import { useToast } from './useToast'

/** How long the in-memory copy stays valid for the opened tab. */
const OBJECT_URL_LIFETIME_MS = 60_000

/**
 * Opens an uploaded statement in a new tab. It is fetched through the API (so auth headers and the
 * mock backend apply, which a plain link to the file would bypass) and then shown from memory.
 */
export function useOpenStatement() {
  const toast = useToast()

  return async (statement: { fileUrl: string; fileName: string }) => {
    // Open the tab now, while still inside the click; after an await the browser would block it as a pop-up.
    const tab = window.open('', '_blank')
    if (!tab) {
      toast('Allow pop-ups for this site to view statements.', 'error')
      return
    }

    try {
      const url = URL.createObjectURL(await api.getStatementFile(statement.fileUrl))
      tab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS)
    } catch (e) {
      tab.close()
      toast(`Couldn’t open ${statement.fileName}: ${(e as Error).message}`, 'error')
    }
  }
}
