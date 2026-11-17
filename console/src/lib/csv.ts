/**
 * One cell of a CSV. A cell with a comma, a quote or a line break is wrapped in quotes, with quotes doubled.
 * A cell that starts with = + - @ or a tab or return would be run as a formula by a spreadsheet, so it gets a leading
 * apostrophe and stays plain text. Customer names and notes come from outside, so this is not optional.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A whole CSV, with a header row and Windows line endings so it opens cleanly in a spreadsheet. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
