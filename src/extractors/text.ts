import * as fs from 'fs';
import { readTextFile, streamTextFile, fileSizeBytes } from '../utils/helpers.js';
import type { DocChunk, ExtractionOptions } from '../types/index.js';

const TEN_MB = 10 * 1024 * 1024;

export async function extractText(
  filePath: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const size = fileSizeBytes(filePath);
  const useStreaming = opts.streaming ?? size > TEN_MB;

  let content = '';

  if (useStreaming) {
    const parts: string[] = [];
    let totalChars = 0;
    let truncatedByOpts = false;

    for await (const chunk of streamTextFile(filePath, opts.chunkSize)) {
      parts.push(chunk);
      totalChars += chunk.length;
      if (opts.maxChars && totalChars >= opts.maxChars) {
        truncatedByOpts = true;
        break;
      }
    }

    content = parts.join('');
    if (truncatedByOpts) {
      warnings.push('Content truncated at maxChars limit during streaming.');
    }
  } else {
    const { text, encoding } = await readTextFile(filePath, opts.encoding);
    if (!encoding.startsWith('utf')) {
      warnings.push(`File encoding detected as "${encoding}". Content decoded automatically.`);
    }
    content = text;
  }

  return {
    chunks: [{ index: 0, content: content.trim(), source: 'Text' }],
    warnings,
  };
}
