import * as fs from 'fs';
import * as path from 'path';
import chardet from 'chardet';
import iconv from 'iconv-lite';
import type { DocType } from '../types/index.js';

// ─── Type Detection ────────────────────────────────────────────────────────────

const EXT_MAP: Record<string, DocType> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'doc',
  xlsx: 'xlsx',
  xls: 'xls',
  pptx: 'pptx',
  ppt: 'ppt',
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  jsonl: 'jsonl',
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  rtf: 'rtf',
  epub: 'epub',
  zip: 'zip',
  log: 'log',
};

/** Magic-byte signatures for format sniffing (first 8 bytes) */
const MAGIC: Array<{ bytes: number[]; type: DocType }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], type: 'pdf' },           // %PDF
  { bytes: [0x50, 0x4b, 0x03, 0x04], type: 'zip' },           // PK (zip, docx, xlsx, pptx, epub share this)
  { bytes: [0x50, 0x4b, 0x05, 0x06], type: 'zip' },
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], type: 'doc' },           // OLE2 (doc, xls, ppt legacy)
  { bytes: [0x7b, 0x5c, 0x72, 0x74, 0x66], type: 'rtf' },     // {\rtf
];

function detectByMagic(buf: Buffer): DocType | null {
  for (const sig of MAGIC) {
    const match = sig.bytes.every((b, i) => buf[i] === b);
    if (match) return sig.type;
  }
  return null;
}

/** Refine a generic 'zip' magic hit using the internal paths */
async function refineZipType(filePath: string): Promise<DocType> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(filePath);
    const names = zip.getEntries().map((e: { entryName: string }) => e.entryName);
    if (names.some((n: string) => n.startsWith('word/'))) return 'docx';
    if (names.some((n: string) => n.startsWith('xl/'))) return 'xlsx';
    if (names.some((n: string) => n.startsWith('ppt/'))) return 'pptx';
    if (names.some((n: string) => n === 'mimetype' || n.startsWith('OEBPS/'))) return 'epub';
    return 'zip';
  } catch {
    return 'zip';
  }
}

export async function detectDocType(filePath: string): Promise<DocType> {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  if (ext && EXT_MAP[ext] && EXT_MAP[ext] !== 'zip') return EXT_MAP[ext];

  // Read first 8 bytes for magic sniffing
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  const magic = detectByMagic(buf);
  if (magic === 'zip') return refineZipType(filePath);
  if (magic) return magic;

  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
  return 'unknown';
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

export async function readTextFile(
  filePath: string,
  hint?: BufferEncoding
): Promise<{ text: string; encoding: string }> {
  const raw = fs.readFileSync(filePath);

  if (hint) {
    return { text: iconv.decode(raw, hint), encoding: hint };
  }

  const detected = chardet.detect(raw);
  const enc = detected ?? 'utf-8';

  try {
    const text = iconv.decode(raw, enc);
    return { text, encoding: enc };
  } catch {
    return { text: raw.toString('utf-8'), encoding: 'utf-8 (fallback)' };
  }
}

// ─── Streaming large text ─────────────────────────────────────────────────────

export async function* streamTextFile(
  filePath: string,
  chunkSize = 1024 * 1024
): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, {
    encoding: 'utf-8',
    highWaterMark: chunkSize,
  });
  for await (const chunk of stream) {
    yield chunk as string;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function truncate(
  text: string,
  maxChars?: number
): { text: string; truncated: boolean } {
  if (!maxChars || text.length <= maxChars) return { text, truncated: false };
  return {
    text: text.slice(0, maxChars) + '\n\n[… content truncated …]',
    truncated: true,
  };
}

export function fileSizeBytes(filePath: string): number {
  return fs.statSync(filePath).size;
}
