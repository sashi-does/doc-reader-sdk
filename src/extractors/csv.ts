import * as fs from 'fs';
import * as readline from 'readline';
import type { DocChunk, ExtractionOptions } from '../types/index.js';

export async function extractCsv(
  filePath: string,
  sep: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const lines: string[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: (opts.encoding ?? 'utf-8') as BufferEncoding }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lines.push(line);
    // Yield chunks to avoid memory blowout on giant CSVs
    if (opts.maxChars && lines.join('\n').length > opts.maxChars) {
      warnings.push(`CSV truncated at ${lines.length} rows due to maxChars limit.`);
      break;
    }
  }

  const header = lines[0] ?? '';
  const cols = header.split(sep).length;
  const content = lines.join('\n');

  return {
    chunks: [{ index: 0, content, source: `${lines.length} rows × ${cols} columns` }],
    warnings,
  };
}
