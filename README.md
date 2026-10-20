# doc-reader-sdk

[![CI](https://github.com/sashi-does/doc-reader-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/sashi-does/doc-reader-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/doc-reader-sdk.svg)](https://www.npmjs.com/package/doc-reader-sdk)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/node/v/doc-reader-sdk.svg)](package.json)

A universal TypeScript/Node.js SDK for extracting plain text from documents — one API for PDF, Word, Excel, PowerPoint, CSV, JSON and more, with automatic type detection, streaming for large files, and graceful fallback instead of thrown exceptions.

```ts
import { readDoc } from 'doc-reader-sdk';

const result = await readDoc('quarterly-report.pdf');
console.log(result.content); // extracted text, ready for search, embeddings, an LLM prompt, etc.
```

## Contents

- [Why this exists](#why-this-exists)
- [Supported formats](#supported-formats)
- [Installation](#installation)
- [Usage](#usage)
- [API reference](#api-reference)
- [CLI](#cli)
- [Large file handling](#large-file-handling)
- [Type detection](#type-detection)
- [Architecture](#architecture)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Why this exists

Pulling text out of a document shouldn't require a different library — and a different mental model — for every file extension. doc-reader-sdk gives you one `read()` call that:

- **Detects the real format** from magic bytes, not just the file extension (so a renamed `.docx` still works).
- **Never throws on a malformed-but-plausible file.** Extractors degrade to a warning instead of an exception — you always get a result back.
- **Chunks content meaningfully** — per PDF page, per spreadsheet sheet, per slide, per JSONL record — so downstream consumers (search indexes, LLM context windows) can work chunk-by-chunk.
- **Streams instead of buffering** for text files over 10 MB.

## Supported formats

| Format | Extension(s) | Notes |
|--------|-------------|-------|
| PDF | `.pdf` | Page-by-page or full text; warns on scanned/image-only PDFs or parser failures instead of throwing |
| Word | `.docx`, `.doc` | Full text via [mammoth](https://github.com/mwilliamson/mammoth.js) |
| Excel | `.xlsx`, `.xls` | Every sheet as CSV by default |
| PowerPoint | `.pptx`, `.ppt` | Slide-by-slide text extraction |
| CSV / TSV | `.csv`, `.tsv` | Streamed line-by-line |
| JSON | `.json` | Pretty-printed; falls back to raw text if invalid |
| JSONL | `.jsonl` | One chunk per record |
| Text / Markdown | `.txt`, `.md` | Auto-encoding detection; streams above 10 MB |
| HTML / XML | `.html`, `.htm`, `.xml` | Raw text preserved |
| RTF / EPUB | `.rtf`, `.epub` | Raw text extraction |
| ZIP | `.zip` | Lists archive contents by default |
| Unknown | any other extension | Best-effort text extraction with encoding detection |

## Installation

```bash
npm install doc-reader-sdk
```

Requires Node.js 18+. The published package ships only compiled `dist/`, `README.md`, and `LICENSE` — no source, test fixtures, or dev tooling (see `files` in [package.json](package.json)).

## Usage

### One-shot

```ts
import { readDoc } from 'doc-reader-sdk';

const result = await readDoc('report.pdf');
console.log(result.content);   // full concatenated text
console.log(result.chunks);    // per-page / per-sheet / per-slide chunks
console.log(result.charCount); // total characters
console.log(result.warnings);  // non-fatal issues (encoding fallback, scanned PDF, etc.)
```

### Reusable instance with default options

```ts
import { DocReader } from 'doc-reader-sdk';

const reader = new DocReader({
  pageByPage: true,   // PDF: extract per page
  allSheets: true,    // XLSX: extract all sheets
  maxChars: 100_000,  // truncate at 100k characters
});

const result = await reader.read('data.xlsx');
```

Per-call options override the instance's defaults:

```ts
await reader.read('other.xlsx', { allSheets: false }); // just this call, first sheet only
```

## API reference

### `readDoc(filePath, options?): Promise<ExtractionResult>`

Convenience wrapper around `new DocReader().read(filePath, options)`.

### `class DocReader`

```ts
new DocReader(defaultOptions?: ExtractionOptions)
```

```ts
reader.read(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult>
```

### `ExtractionOptions`

```ts
interface ExtractionOptions {
  maxChars?: number;         // truncate output across chunks. Default: unlimited
  pageByPage?: boolean;      // PDF: per-page chunks. Default: false
  allSheets?: boolean;       // XLSX: include every sheet. Default: true
  listOnly?: boolean;        // ZIP: list entries only, don't extract. Default: true
  encoding?: BufferEncoding; // force a text encoding instead of auto-detecting
  streaming?: boolean;       // force streaming mode. Default: true for files > 10 MB
  chunkSize?: number;        // stream chunk size in bytes. Default: 1 MB
}
```

### `ExtractionResult`

```ts
interface ExtractionResult {
  type: DocType;       // detected format, e.g. "pdf" | "docx" | "xlsx" | ...
  content: string;     // full text, chunks joined with "\n\n"
  chunks: DocChunk[];  // [{ index, content, source }]
  charCount: number;   // content.length
  truncated: boolean;  // true if maxChars cut content short
  warnings: string[];  // non-fatal issues encountered during extraction
}
```

### `DocChunk`

```ts
interface DocChunk {
  index: number;
  content: string;
  source?: string; // "Page 3", "Sheet: Finance", "Slide 2", "Record 14", ...
}
```

## CLI

Installing the package also gives you a `doc-reader` binary:

```bash
npx doc-reader report.pdf
npx doc-reader large.pdf --page-by-page --max-chars 50000
npx doc-reader data.xlsx --no-all-sheets
npx doc-reader archive.zip --list-only
npx doc-reader notes.docx --json   # raw ExtractionResult as JSON
npx doc-reader --help
```

Options mirror `ExtractionOptions`: `--max-chars <n>`, `--page-by-page`, `--no-all-sheets`, `--list-only`, `--json`.

## Large file handling

- Text-based files **> 10 MB** automatically switch to streaming (override with the `streaming` option).
- PDFs are read into memory by `pdf-parse`; use `maxChars` to cap how much text you keep.
- CSV and JSONL are read line-by-line via Node streams and stop early once `maxChars` is reached.
- `maxChars` truncates across chunks, not just the first one — it cuts off exactly where the running total would exceed the limit.

## Type detection

Detection runs in layers, so a misnamed file still resolves correctly:

1. **Extension map** — fast path for known extensions.
2. **Magic bytes** — reads the first 8 bytes to recognize PDF, OLE2 (legacy Office), and ZIP-based containers.
3. **ZIP refinement** — for anything that matches the generic ZIP signature, inspects internal paths (`word/`, `xl/`, `ppt/`, `OEBPS/`) to tell DOCX, XLSX, PPTX and EPUB apart.

## Architecture

```
src/
  index.ts              DocReader class + readDoc() export
  cli.ts                CLI entry point
  test.ts               Fixture-based smoke test runner (npm run test:smoke)
  types/index.ts        ExtractionResult, DocChunk, ExtractionOptions, DocType
  utils/helpers.ts       type detection, encoding, streaming
  extractors/
    pdf.ts               pdf-parse; catches parser failures and returns a warning
    docx.ts              mammoth
    xlsx.ts              xlsx (SheetJS)
    pptx.ts              adm-zip + regex text-node extraction over DrawingML
    csv.ts               readline streaming
    json.ts              JSON.parse + JSONL line-by-line
    text.ts              streaming read + iconv-lite encoding
    zip.ts               adm-zip manifest listing
```

## Security

doc-reader-sdk is designed to degrade gracefully rather than throw when a file is malformed, but parsing untrusted input (uploads, third-party documents) always carries some risk from the underlying parser libraries. See [SECURITY.md](SECURITY.md) for the current threat model, how to report a vulnerability, and known transitive-dependency advisories (`xlsx`/SheetJS has unpatched advisories on the npm registry; see that file for details and mitigations).

## Contributing

Bug reports, format requests, and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the dev workflow and how to add a new format.

```bash
npm install
npm run typecheck
npm test           # vitest
npm run test:smoke # runs every file in test-fixtures/ through the CLI formatter
npm run build
```

## License

[MIT](LICENSE)
