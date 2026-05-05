# doc-reader-sdk

A universal TypeScript/Node.js SDK to extract text content from any document — no matter the size.

## Supported Formats

| Format | Extension(s) | Notes |
|--------|-------------|-------|
| PDF | `.pdf` | Page-by-page or full; warns on scanned/image PDFs |
| Word | `.docx`, `.doc` | Full text via mammoth |
| Excel | `.xlsx`, `.xls` | All sheets as CSV, streaming-safe |
| PowerPoint | `.pptx`, `.ppt` | Slide-by-slide text extraction |
| CSV / TSV | `.csv`, `.tsv` | Streamed line-by-line |
| JSON | `.json` | Pretty-printed |
| JSONL | `.jsonl` | Per-record chunks |
| Text / Markdown | `.txt`, `.md` | Auto-encoding detection, streaming >10 MB |
| HTML / XML | `.html`, `.htm`, `.xml` | Raw text preserved |
| RTF / EPUB | `.rtf`, `.epub` | Raw text extraction |
| ZIP | `.zip` | Lists archive contents |
| Unknown | any | Attempts text extraction with encoding detection |

## Installation

```bash
npm install
```

## Usage

### As a library

```typescript
import { readDoc, DocReader } from './src/index.js';

// One-shot convenience function
const result = await readDoc('report.pdf');
console.log(result.content);       // full text
console.log(result.chunks);        // per-page / per-sheet / per-slide chunks
console.log(result.charCount);     // total characters
console.log(result.warnings);      // any extraction warnings

// Class with default options
const reader = new DocReader({
  pageByPage: true,    // PDF: extract per page
  allSheets: true,     // XLSX: extract all sheets
  maxChars: 100_000,   // truncate at 100k chars
});
const r = await reader.read('data.xlsx');
```

### ExtractionResult shape

```typescript
interface ExtractionResult {
  type: DocType;          // detected format
  content: string;        // full concatenated text
  chunks: DocChunk[];     // [{index, content, source}]
  charCount: number;
  truncated: boolean;
  warnings: string[];
}
```

### ExtractionOptions

```typescript
interface ExtractionOptions {
  maxChars?: number;        // truncate output
  pageByPage?: boolean;     // PDF: per-page chunks
  allSheets?: boolean;      // XLSX: all sheets (default: true)
  listOnly?: boolean;       // ZIP: list only (default: true)
  encoding?: BufferEncoding;// force text encoding
  streaming?: boolean;      // force streaming mode
  chunkSize?: number;       // stream chunk size in bytes (default: 1 MB)
}
```

## CLI

```bash
# Run any file
npx tsx src/cli.ts path/to/file.pdf

# Options
npx tsx src/cli.ts report.pdf --page-by-page
npx tsx src/cli.ts data.xlsx --no-all-sheets
npx tsx src/cli.ts large.txt --max-chars 50000
npx tsx src/cli.ts archive.zip --list-only
npx tsx src/cli.ts data.json --json        # raw JSON output

# Help
npx tsx src/cli.ts --help
```

## Test Suite

```bash
npx tsx src/test.ts
```

Runs all fixtures in `test-fixtures/` and prints extracted content + summary.

## Build

```bash
npm run build    # outputs to dist/
```

## Architecture

```
src/
  index.ts              ← DocReader class + readDoc() export
  cli.ts                ← CLI entry point
  test.ts               ← Test runner
  types/
    index.ts            ← ExtractionResult, DocChunk, ExtractionOptions, DocType
  utils/
    helpers.ts          ← type detection (magic bytes + extension), encoding, streaming
  extractors/
    pdf.ts              ← pdf-parse
    docx.ts             ← mammoth
    xlsx.ts             ← xlsx (SheetJS)
    pptx.ts             ← adm-zip + htmlparser2 (DrawingML text nodes)
    csv.ts              ← readline streaming
    json.ts             ← JSON.parse + JSONL line-by-line
    text.ts             ← streaming read + iconv-lite encoding
    zip.ts              ← adm-zip manifest listing
```

## Large File Handling

- Files **> 10 MB** automatically switch to streaming mode (configurable via `streaming` option)
- PDFs are never fully buffered in page-by-page mode
- CSVs and JSONL stream line-by-line
- `maxChars` cuts off extraction early to avoid runaway memory

## Type Detection

Uses two layers:
1. **Extension map** — fast path for known extensions
2. **Magic bytes** — reads first 8 bytes to detect PDF, OLE2 (legacy Office), ZIP-based formats
3. **ZIP refinement** — inspects internal paths to distinguish DOCX vs XLSX vs PPTX vs EPUB
