import { pluralize } from '../helpers/format'
import { useProviderPicker } from './useProviderPicker'
import { useToast } from './useToast'

export type ProviderOptionsView = 'loading' | 'error' | 'empty' | 'list'

/** The "add providers" dialog: picker state plus what to show and say at each step. */
export function useAddProvidersDialog(onClose: () => void) {
  const picker = useProviderPicker()
  const toast = useToast()
  const count = picker.selectedIds.length

  let view: ProviderOptionsView = 'list'
  if (picker.isLoading) view = 'loading'
  else if (picker.loadError) view = 'error'
  else if (picker.providers.length === 0) view = 'empty'

  const emptyMessage = picker.query
    ? `No providers match “${picker.query}”.`
    : 'You’ve added every provider we know about.'
  const confirmLabel = count > 0 ? `Add ${pluralize(count, 'provider')}` : 'Add providers'

  const add = async () => {
    try {
      await picker.confirm()
    } catch {
      return // shown inline via addError
    }
    toast(`Added ${pluralize(count, 'provider')}`)
    onClose()
  }

  return { ...picker, view, emptyMessage, confirmLabel, canConfirm: count > 0, add }
}
