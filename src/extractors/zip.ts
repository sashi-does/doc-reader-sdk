import AdmZip from 'adm-zip';
import type { DocChunk } from '../types/index.js';

export async function extractZip(
  filePath: string,
  listOnly = true
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  const lines: string[] = ['Archive contents:', ''];
  for (const e of entries) {
    const size = e.header.size;
    lines.push(`  ${e.isDirectory ? '[DIR] ' : '      '} ${e.entryName}  (${size} bytes)`);
  }

  if (!listOnly) {
    warnings.push('Full ZIP extraction not performed. Set listOnly:false to extract individual entries.');
  }

  return {
    chunks: [{ index: 0, content: lines.join('\n'), source: `ZIP (${entries.length} entries)` }],
    warnings,
  };
}
