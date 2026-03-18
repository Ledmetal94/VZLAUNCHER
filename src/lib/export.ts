/**
 * Client-side CSV and PDF export utilities.
 * No external dependencies — CSV via Blob, PDF via print dialog.
 */

/** Download a CSV file from an array of rows */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n')

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Escape HTML entities to prevent XSS in generated documents */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Open a print dialog with a styled HTML table (acts as PDF export via browser print-to-PDF) */
export function printReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  totals?: string[],
) {
  const win = window.open('', '_blank')
  if (!win) return

  const esc = escapeHtml

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px">${esc(c)}</td>`).join('')}</tr>`,
    )
    .join('')

  const totalsRow = totals
    ? `<tr style="border-top:2px solid #333;font-weight:800">${totals.map((c) => `<td style="padding:8px 10px;font-size:12px">${esc(c)}</td>`).join('')}</tr>`
    : ''

  win.document.write(`<!DOCTYPE html>
<html><head><title>${esc(title)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 12px; font-weight: 400; color: #666; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 2px solid #333; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>${esc(title)}</h1>
<h2>${esc(subtitle)}</h2>
<table>
<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${tableRows}${totalsRow}</tbody>
</table>
<script>window.onload = function() { window.print(); }</script>
</body></html>`)

  win.document.close()
}
