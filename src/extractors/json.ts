import * as fs from 'fs';
import * as readline from 'readline';
import type { DocChunk, ExtractionOptions } from '../types/index.js';

export async function extractJson(
  filePath: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const raw = fs.readFileSync(filePath, 'utf-8').trim();

  try {
    const parsed = JSON.parse(raw);
    const formatted = JSON.stringify(parsed, null, 2);
    return {
      chunks: [{ index: 0, content: formatted, source: 'JSON' }],
      warnings,
    };
  } catch (e: unknown) {
    warnings.push(`Not valid JSON: ${(e as Error).message}. Returning raw text.`);
    return {
      chunks: [{ index: 0, content: raw, source: 'JSON (raw)' }],
      warnings,
    };
  }
}

export async function extractJsonl(
  filePath: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const chunks: DocChunk[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let i = 0;
  let totalChars = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;

    let pretty: string;
    try {
      pretty = JSON.stringify(JSON.parse(line), null, 2);
    } catch {
      pretty = line;
      warnings.push(`Line ${i + 1}: not valid JSON, kept as-is.`);
    }

    chunks.push({ index: i, content: pretty, source: `Record ${i + 1}` });
    totalChars += pretty.length;
    i++;

    if (opts.maxChars && totalChars > opts.maxChars) {
      warnings.push(`JSONL truncated at record ${i} due to maxChars limit.`);
      break;
    }
  }

  return { chunks, warnings };
}
