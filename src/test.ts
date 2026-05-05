import * as path from 'path';
import * as fs from 'fs';
import { DocReader } from './index.js';
import type { ExtractionResult } from './index.js';

const FIXTURES_DIR = path.join(process.cwd(), 'test-fixtures');

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', gray: '\x1b[90m',
};
const c = (k: keyof typeof C, s: string) => `${C[k]}${s}${C.reset}`;
const hr = (ch = '─', n = 72) => ch.repeat(n);

function printResult(file: string, result: ExtractionResult, elapsed: number) {
  const name = path.basename(file);
  const icon = result.warnings.length > 0 ? '⚠ ' : '✓ ';
  const col  = result.warnings.length > 0 ? 'yellow' : 'green';

  console.log('\n' + c('cyan', hr('═')));
  console.log(c(col, `${icon}${name}`) + c('dim', `  [${result.type.toUpperCase()}]  ${result.charCount.toLocaleString()} chars  ${result.chunks.length} chunk(s)  ${elapsed}ms`));
  if (result.warnings.length) {
    result.warnings.forEach(w => console.log(c('yellow', `  ⚠ ${w}`)));
  }
  console.log(c('cyan', hr('─')));

  // Print up to 800 chars per chunk as preview
  for (const chunk of result.chunks) {
    if (result.chunks.length > 1) {
      console.log(c('blue', `  ▸ ${chunk.source ?? `Chunk ${chunk.index + 1}`}`));
    }
    const preview = chunk.content.length > 800
      ? chunk.content.slice(0, 800) + c('gray', `\n  … (${(chunk.content.length - 800).toLocaleString()} more chars)`)
      : chunk.content;
    console.log(preview);
    console.log();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + c('bold', c('cyan', '  DOC-READER-SDK — Test Suite')));
  console.log(c('dim', `  Fixtures: ${FIXTURES_DIR}\n`));

  const reader = new DocReader({ pageByPage: true, allSheets: true });

  const files = fs.readdirSync(FIXTURES_DIR)
    .filter(f => !f.startsWith('.'))
    .map(f => path.join(FIXTURES_DIR, f))
    .filter(f => fs.statSync(f).isFile());

  let passed = 0;
  let failed = 0;
  const summary: Array<{ name: string; ok: boolean; chars: number; time: number }> = [];

  for (const file of files) {
    const name = path.basename(file);
    const t0 = Date.now();
    try {
      const result = await reader.read(file);
      const elapsed = Date.now() - t0;
      printResult(file, result, elapsed);
      passed++;
      summary.push({ name, ok: true, chars: result.charCount, time: elapsed });
    } catch (err: unknown) {
      const elapsed = Date.now() - t0;
      console.log('\n' + c('red', `✗ ${name}`) + c('dim', `  ${elapsed}ms`));
      console.log(c('red', `  Error: ${(err as Error).message}`));
      failed++;
      summary.push({ name, ok: false, chars: 0, time: elapsed });
    }
  }

  // ─── Summary table ─────────────────────────────────────────────────────────
  console.log('\n' + c('cyan', hr('═')));
  console.log(c('bold', '  SUMMARY'));
  console.log(c('cyan', hr('─')));
  for (const s of summary) {
    const icon = s.ok ? c('green', '✓') : c('red', '✗');
    const chars = s.ok ? c('dim', `${s.chars.toLocaleString()} chars`) : '';
    console.log(`  ${icon}  ${s.name.padEnd(30)} ${chars.padEnd(18)} ${c('dim', `${s.time}ms`)}`);
  }
  console.log(c('cyan', hr('─')));
  console.log(`  ${c('green', `${passed} passed`)}  ${failed > 0 ? c('red', `${failed} failed`) : ''}`);
  console.log(c('cyan', hr('═')) + '\n');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(c('red', `Fatal: ${err.message}`));
  process.exit(1);
});
