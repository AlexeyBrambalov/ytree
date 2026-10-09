import type { Provider } from '../api/schemas'
import { assertNever } from '../helpers/assertNever'
import { CATEGORY_LABEL } from '../helpers/labels'
import { useAddProvidersDialog, type ProviderOptionsView } from '../hooks/useAddProvidersDialog'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Spinner } from './ui/Spinner'

export function AddProvidersDialog({ onClose }: { onClose: () => void }) {
  const dialog = useAddProvidersDialog(onClose)

  return (
    <Modal
      title="Add providers"
      description="Pick every bank, pension or investment platform you hold money with."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!dialog.canConfirm} loading={dialog.isAdding} onClick={dialog.add}>
            {dialog.confirmLabel}
          </Button>
        </>
      }
    >
      <input
        type="search"
        value={dialog.query}
        onChange={(e) => dialog.setQuery(e.target.value)}
        placeholder="Search providers"
        aria-label="Search providers"
        className="w-full rounded-full border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-cyan-400 focus:bg-white"
      />

      {dialog.addError && (
        <p role="alert" className="mt-3 rounded-2xl bg-bad-50 px-4 py-2 text-sm text-bad-600">{dialog.addError.message}</p>
      )}

      <div className="mt-3 min-h-48">
        <ProviderOptions
          view={dialog.view}
          providers={dialog.providers}
          selectedIds={dialog.selectedIds}
          loadError={dialog.loadError}
          emptyMessage={dialog.emptyMessage}
          onToggle={dialog.toggle}
          onRetry={dialog.retryLoad}
        />
      </div>
    </Modal>
  )
}

interface ProviderOptionsProps {
  view: ProviderOptionsView
  providers: Provider[]
  selectedIds: string[]
  loadError: Error | null
  emptyMessage: string
  onToggle: (id: string) => void
  onRetry: () => void
}

function ProviderOptions({ view, providers, selectedIds, loadError, emptyMessage, onToggle, onRetry }: ProviderOptionsProps) {
  switch (view) {
    case 'loading':
      return <p className="flex items-center gap-2 py-6 text-sm text-muted"><Spinner className="size-4" /> Loading providers…</p>

    case 'error':
      return (
        <div className="py-6 text-sm">
          <p className="text-bad-600">{loadError?.message}</p>
          <Button size="sm" className="mt-2" onClick={onRetry}>Try again</Button>
        </div>
      )

    case 'empty':
      return <p className="py-6 text-sm text-muted">{emptyMessage}</p>

    case 'list':
      return (
        <ul className="divide-y divide-line">
          {providers.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-navy-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => onToggle(p.id)}
                  className="size-4 accent-navy-900"
                />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted">{CATEGORY_LABEL[p.category]}</span>
              </label>
            </li>
          ))}
        </ul>
      )

    default:
      return assertNever(view)
  }
}
