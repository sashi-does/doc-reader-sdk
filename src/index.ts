import * as path from 'path';
import { detectDocType, truncate } from './utils/helpers.js';
import { extractPdf } from './extractors/pdf.js';
import { extractDocx } from './extractors/docx.js';
import { extractXlsx } from './extractors/xlsx.js';
import { extractPptx } from './extractors/pptx.js';
import { extractCsv } from './extractors/csv.js';
import { extractJson, extractJsonl } from './extractors/json.js';
import { extractText } from './extractors/text.js';
import { extractZip } from './extractors/zip.js';
import type { ExtractionOptions, ExtractionResult, DocType } from './types/index.js';

export type { ExtractionOptions, ExtractionResult, DocChunk, DocType } from './types/index.js';

export class DocReader {
  private defaultOptions: ExtractionOptions;

  constructor(defaultOptions: ExtractionOptions = {}) {
    this.defaultOptions = {
      allSheets: true,
      listOnly: true,
      pageByPage: false,
      chunkSize: 1024 * 1024, // 1 MB
      ...defaultOptions,
    };
  }

  /**
   * Read any document file and return its full text content.
   * Handles PDF, DOCX, XLSX, PPTX, CSV, JSON, JSONL, TXT, MD, HTML, XML, ZIP, and more.
   */
  async read(
    filePath: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const opts: ExtractionOptions = { ...this.defaultOptions, ...options };
    const absPath = path.resolve(filePath);
    const docType: DocType = await detectDocType(absPath);

    let chunks: ExtractionResult['chunks'] = [];
    let warnings: string[] = [];

    switch (docType) {
      case 'pdf': {
        const res = await extractPdf(absPath, opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'docx':
      case 'doc': {
        const res = await extractDocx(absPath);
        chunks = res.chunks;
        warnings = res.warnings;
        if (docType === 'doc') {
          warnings.unshift('Legacy .doc format — results may be incomplete. Convert to .docx for best results.');
        }
        break;
      }
      case 'xlsx':
      case 'xls': {
        const res = await extractXlsx(absPath, opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'pptx':
      case 'ppt': {
        const res = await extractPptx(absPath);
        chunks = res.chunks;
        warnings = res.warnings;
        if (docType === 'ppt') {
          warnings.unshift('Legacy .ppt format detected. Results may be incomplete.');
        }
        break;
      }
      case 'csv': {
        const res = await extractCsv(absPath, ',', opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'tsv': {
        const res = await extractCsv(absPath, '\t', opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'json': {
        const res = await extractJson(absPath, opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'jsonl': {
        const res = await extractJsonl(absPath, opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'zip': {
        const res = await extractZip(absPath, opts.listOnly !== false);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
      case 'txt':
      case 'md':
      case 'html':
      case 'xml':
      case 'rtf':
      case 'epub':
      case 'log':
      case 'unknown':
      default: {
        const res = await extractText(absPath, opts);
        chunks = res.chunks;
        warnings = res.warnings;
        break;
      }
    }

    // Apply maxChars truncation across chunks if set
    let truncated = false;
    if (opts.maxChars) {
      let remaining = opts.maxChars;
      for (const chunk of chunks) {
        if (remaining <= 0) {
          chunk.content = '';
        } else if (chunk.content.length > remaining) {
          chunk.content = chunk.content.slice(0, remaining) + '\n\n[… truncated …]';
          remaining = 0;
          truncated = true;
        } else {
          remaining -= chunk.content.length;
        }
      }
    }

    const fullContent = chunks.map(c => c.content).join('\n\n');

    return {
      type: docType,
      content: fullContent,
      chunks,
      charCount: fullContent.length,
      truncated,
      warnings,
    };
  }
}

/** Convenience one-shot function */
export async function readDoc(
  filePath: string,
  options?: ExtractionOptions
): Promise<ExtractionResult> {
  return new DocReader().read(filePath, options);
}
