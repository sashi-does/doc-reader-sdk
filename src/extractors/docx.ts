import * as fs from 'fs';
import mammoth from 'mammoth';
import type { DocChunk } from '../types/index.js';

export async function extractDocx(
  filePath: string
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];

  const buf = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer: buf });

  if (result.messages.length > 0) {
    result.messages.forEach(m => {
      if (m.type === 'warning') warnings.push(`mammoth: ${m.message}`);
    });
  }

  const text = result.value.trim();
  return {
    chunks: [{ index: 0, content: text, source: 'Document' }],
    warnings,
  };
}
