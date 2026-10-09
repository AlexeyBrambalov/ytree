/**
 * A minimal one-page PDF with a few lines of text, so seeded statements open like real ones.
 * ASCII only: the xref table needs byte offsets, which then equal string offsets.
 */
export function samplePdf(lines: string[]): Blob {
  const escape = (s: string) => s.replace(/[\\()]/g, '\\$&')
  const text = lines.map((line, i) => `${i === 0 ? '' : '0 -28 Td '}(${escape(line)}) Tj`).join('\n')
  const content = `BT\n/F1 18 Tf\n72 720 Td\n${text}\nET`

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const offset = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return new Blob([pdf], { type: 'application/pdf' })
}
