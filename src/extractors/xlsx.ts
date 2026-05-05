import * as fs from 'fs';
import * as XLSX from 'xlsx';
import type { DocChunk, ExtractionOptions } from '../types/index.js';

export async function extractXlsx(
  filePath: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];

  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

  const sheetNames = opts.allSheets !== false ? wb.SheetNames : [wb.SheetNames[0]];
  const chunks: DocChunk[] = [];

  for (let i = 0; i < sheetNames.length; i++) {
    const name = sheetNames[i];
    const ws = wb.Sheets[name];
    if (!ws) continue;

    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    if (!csv.trim()) {
      warnings.push(`Sheet "${name}" is empty.`);
      continue;
    }

    chunks.push({ index: i, content: csv.trim(), source: `Sheet: ${name}` });
  }

  return { chunks, warnings };
}
