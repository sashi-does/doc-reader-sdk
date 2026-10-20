export type DocType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'xlsx'
  | 'xls'
  | 'pptx'
  | 'ppt'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'jsonl'
  | 'txt'
  | 'md'
  | 'html'
  | 'xml'
  | 'rtf'
  | 'epub'
  | 'zip'
  | 'log'
  | 'unknown';

export interface ExtractionOptions {
  /** Max characters to return. Default: unlimited */
  maxChars?: number;
  /** For PDFs: extract page-by-page. Default: false */
  pageByPage?: boolean;
  /** For spreadsheets: include all sheets. Default: true */
  allSheets?: boolean;
  /** For ZIP: list files only, don't extract. Default: true */
  listOnly?: boolean;
  /** Encoding hint for text files. Default: auto-detect */
  encoding?: BufferEncoding;
  /** Stream large files in chunks instead of buffering. Default: true for >10MB */
  streaming?: boolean;
  /** Chunk size for streaming in bytes. Default: 1MB */
  chunkSize?: number;
}

export interface DocChunk {
  index: number;
  content: string;
  /** Source label: page number, sheet name, slide index, etc. */
  source?: string;
}

export interface ExtractionResult {
  /** Detected document type */
  type: DocType;
  /** Full concatenated content */
  content: string;
  /** Individual chunks (pages, sheets, slides…) */
  chunks: DocChunk[];
  /** Total character count */
  charCount: number;
  /** Whether content was truncated by maxChars */
  truncated: boolean;
  /** Warning messages (encoding fallback, partial extraction, etc.) */
  warnings: string[];
}
