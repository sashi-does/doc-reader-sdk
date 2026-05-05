import * as fs from 'fs';
import type { DocChunk, ExtractionOptions } from '../types/index.js';

interface PdfData {
  text: string;
  numpages: number;
}

export async function extractPdf(
  filePath: string,
  opts: ExtractionOptions
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];

  // Dynamically import pdf-parse (it has side-effects on require)
  const pdfParse = (await import('pdf-parse')).default as (
    buf: Buffer,
    options?: Record<string, unknown>
  ) => Promise<PdfData>;

  const buf = fs.readFileSync(filePath);
  const chunks: DocChunk[] = [];

  if (opts.pageByPage) {
    let pageNum = 0;
    const pageTexts: string[] = [];

    const pageRender = async (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pageTexts.push(text);
      return text;
    };

    await pdfParse(buf, { pagerender: pageRender });

    for (const text of pageTexts) {
      pageNum++;
      chunks.push({ index: pageNum - 1, content: text.trim(), source: `Page ${pageNum}` });
    }
  } else {
    const data = await pdfParse(buf);
    chunks.push({ index: 0, content: data.text.trim(), source: `All ${data.numpages} pages` });
  }

  if (chunks.every(c => !c.content)) {
    warnings.push('PDF appears to be image-based (scanned). No text could be extracted. Consider OCR.');
  }

  return { chunks, warnings };
}
