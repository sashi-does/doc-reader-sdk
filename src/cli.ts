#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { DocReader } from './index.js';
import type { ExtractionResult, ExtractionOptions } from './index.js';

// ─── ANSI colours (no deps) ───────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  gray:   '\x1b[90m',
};

function c(color: keyof typeof C, text: string) {
  return process.stdout.isTTY ? `${C[color]}${text}${C.reset}` : text;
}

function hr(char = '─', width = 72) {
  return char.repeat(width);
}

function banner(result: ExtractionResult, filePath: string) {
  const fileName = path.basename(filePath);
  const fileSizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);

  console.log('\n' + c('cyan', hr('═')));
  console.log(c('bold', `    ${fileName}`));
  console.log(c('dim',  `      Type: ${result.type.toUpperCase()}  |  Size: ${fileSizeKB} KB  |  Characters: ${result.charCount.toLocaleString()}  |  Chunks: ${result.chunks.length}`));
  if (result.truncated) {
    console.log(c('yellow', `  ⚠  Content truncated`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.log(c('yellow', `  ⚠  ${w}`)));
  }
  console.log(c('cyan', hr('═')) + '\n');
}

function printResult(result: ExtractionResult) {
  for (const chunk of result.chunks) {
    if (result.chunks.length > 1) {
      console.log(c('blue', hr('─')));
      console.log(c('bold', `  ▸ ${chunk.source ?? `Chunk ${chunk.index + 1}`}`));
      console.log(c('blue', hr('─')));
    }
    console.log(chunk.content);
    console.log();
  }
}

function usage() {
  console.log(`
${c('bold', 'doc-reader')} — Extract text from any document

${c('bold', 'Usage:')}
  npx tsx src/cli.ts <file> [options]

${c('bold', 'Options:')}
  --max-chars <n>     Truncate output at N characters
  --page-by-page      (PDF) Show each page separately
  --no-all-sheets     (XLSX) Only read the first sheet
  --list-only         (ZIP) List archive contents only (default)
  --json              Output raw JSON instead of pretty-print
  --help              Show this help

${c('bold', 'Examples:')}
  npx tsx src/cli.ts report.pdf
  npx tsx src/cli.ts data.xlsx
  npx tsx src/cli.ts large.pdf --page-by-page --max-chars 50000
  npx tsx src/cli.ts archive.zip --list-only
  npx tsx src/cli.ts notes.docx --json
`);
}

// ─── Parse argv ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) { usage(); process.exit(0); }

const filePath = args[0];
const opts: ExtractionOptions = {};
let jsonMode = false;

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--max-chars' && args[i + 1]) {
    opts.maxChars = parseInt(args[++i], 10);
  } else if (a === '--page-by-page') {
    opts.pageByPage = true;
  } else if (a === '--no-all-sheets') {
    opts.allSheets = false;
  } else if (a === '--list-only') {
    opts.listOnly = true;
  } else if (a === '--json') {
    jsonMode = true;
  }
}

if (!fs.existsSync(filePath)) {
  console.error(c('red', `✗ File not found: ${filePath}`));
  process.exit(1);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const reader = new DocReader(opts);
    const result = await reader.read(filePath);

    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      banner(result, filePath);
      printResult(result);
      console.log(c('gray', `\nDone. ${result.charCount.toLocaleString()} characters extracted from ${result.chunks.length} chunk(s).\n`));
    }
  } catch (err: unknown) {
    console.error(c('red', `✗ Error: ${(err as Error).message}`));
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  }
})();
