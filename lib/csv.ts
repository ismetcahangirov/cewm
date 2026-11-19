export const csvSeparator = ";";

const byteOrderMark = String.fromCharCode(0xfeff);

const formulaStart = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (formulaStart.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return byteOrderMark + rows.map((row) => row.map(csvCell).join(csvSeparator)).join("\r\n");
}
