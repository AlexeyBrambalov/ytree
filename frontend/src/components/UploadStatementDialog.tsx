import { useId } from 'react'
import type { Account } from '../api/schemas'
import { MAX_STATEMENT_FILE_MB, STATEMENT_FILE_EXTENSIONS } from '../domain/statement'
import { QA } from '../helpers/qa'
import { useUploadStatementDialog } from '../hooks/useUploadStatementDialog'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

interface Props {
  account: Account
  today?: Date
  onClose: () => void
}

export function UploadStatementDialog({ account, today, onClose }: Props) {
  const { form, title, description, dateWarning, isSaving, saveError } = useUploadStatementDialog({ account, today, onClose })
  const formId = useId()
  const fileHintId = `${formId}-file-hint`
  const dateHintId = `${formId}-date-hint`
  const dateHint = form.errors.statementDate ?? dateWarning

  return (
    <Modal
      qa={QA.uploadDialog}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" data-qa={QA.uploadCancelButton} onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} data-qa={QA.uploadSaveButton} loading={isSaving}>Save statement</Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="space-y-5 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div>
          <label className="block">
            <span className="text-sm font-medium">Statement file</span>
            <input
              type="file"
              data-qa={QA.statementFileInput}
              accept={STATEMENT_FILE_EXTENSIONS.join(',')}
              aria-invalid={!!form.errors.file}
              aria-describedby={fileHintId}
              onChange={(e) => form.setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full rounded-2xl border border-dashed border-navy-300 bg-canvas p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <FileHint id={fileHintId} error={form.errors.file} />
        </div>

        <div>
          <label className="block">
            <span className="text-sm font-medium">Statement date</span>
            <input
              type="date"
              data-qa={QA.statementDateInput}
              value={form.values.statementDate}
              max={form.todayIso}
              aria-invalid={!!form.errors.statementDate}
              aria-describedby={dateHint ? dateHintId : undefined}
              onChange={(e) => form.setStatementDate(e.target.value)}
              className="mt-1.5 block w-full rounded-full border border-line px-4 py-2 text-sm"
            />
          </label>
          <DateHint id={dateHintId} error={form.errors.statementDate} warning={dateWarning} />
        </div>

        {saveError && <p role="alert" data-qa={QA.uploadError} className="rounded-2xl bg-bad-50 px-4 py-2 text-sm text-bad-600">{saveError.message}</p>}
      </form>
    </Modal>
  )
}

/** The file field shows what it accepts until there is something wrong with the chosen file. */
function FileHint({ id, error }: { id: string; error?: string }) {
  if (error) return <p id={id} data-qa={QA.statementFileHint} className="mt-1 text-sm text-bad-600">{error}</p>
  return <p id={id} data-qa={QA.statementFileHint} className="mt-1 text-xs text-muted">PDF, PNG or JPEG, up to {MAX_STATEMENT_FILE_MB} MB.</p>
}

/** The date field shows either its validation error or the "won't count" warning, never both. */
function DateHint({ id, error, warning }: { id: string; error?: string; warning: string | null }) {
  if (error) return <p id={id} data-qa={QA.statementDateHint} className="mt-1 text-sm text-bad-600">{error}</p>
  if (warning) return <p id={id} data-qa={QA.statementDateHint} className="mt-1 text-sm text-warn-600">{warning}</p>
  return null
}
