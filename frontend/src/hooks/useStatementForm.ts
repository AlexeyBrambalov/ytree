import { useMemo, useState } from 'react'
import { makeUploadStatementSchema, type UploadStatementRequest } from '../api/schemas'
import { getStatementStatus, localIsoDate } from '../domain/statement'

interface Values {
  file: File | null
  statementDate: string
}

type Errors = Partial<Record<keyof Values, string>>

interface Options {
  onValid: (values: UploadStatementRequest) => void
  today?: Date
}

/** Form state + zod validation for "upload a statement" (the file and the statement's date). */
export function useStatementForm({ onValid, today = new Date() }: Options) {
  const todayIso = localIsoDate(today)
  const schema = useMemo(() => makeUploadStatementSchema(todayIso), [todayIso])
  const [values, setValues] = useState<Values>({ file: null, statementDate: todayIso })
  const [errors, setErrors] = useState<Errors>({})

  const update = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = () => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message
      setErrors(next)
      return
    }
    onValid(parsed.data)
  }

  const wouldBeOutdated =
    !!values.statementDate && getStatementStatus({ statementDate: values.statementDate }, new Date(`${todayIso}T00:00:00Z`)) === 'OUTDATED'

  return {
    values,
    errors,
    todayIso,
    wouldBeOutdated,
    setFile: (file: File | null) => update('file', file),
    setStatementDate: (date: string) => update('statementDate', date),
    handleSubmit,
  }
}
