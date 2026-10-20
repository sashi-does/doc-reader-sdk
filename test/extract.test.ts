import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readDoc, DocReader } from '../src/index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(dirname, '..', 'test-fixtures', name);

describe('format detection + extraction', () => {
  it('extracts plain text with correct type', async () => {
    const result = await readDoc(fixture('sample.txt'));
    expect(result.type).toBe('txt');
    expect(result.content).toContain('Hello from doc-reader-sdk!');
    expect(result.charCount).toBeGreaterThan(0);
  });

  it('extracts markdown verbatim', async () => {
    const result = await readDoc(fixture('sample.md'));
    expect(result.type).toBe('md');
    expect(result.content).toContain('# Doc Reader SDK');
  });

  it('extracts CSV rows', async () => {
    const result = await readDoc(fixture('sample.csv'));
    expect(result.type).toBe('csv');
    expect(result.content).toContain('Name,Age,City,Score');
    expect(result.content).toContain('Alice,30,New York,95.5');
    expect(result.chunks[0].source).toBe('6 rows × 4 columns');
  });

  it('pretty-prints JSON', async () => {
    const result = await readDoc(fixture('sample.json'));
    expect(result.type).toBe('json');
    const parsed = JSON.parse(result.content);
    expect(parsed.project).toBe('doc-reader-sdk');
    expect(result.warnings).toHaveLength(0);
  });

  it('splits JSONL into one chunk per record', async () => {
    const result = await readDoc(fixture('sample.jsonl'));
    expect(result.type).toBe('jsonl');
    expect(result.chunks).toHaveLength(3);
    expect(JSON.parse(result.chunks[0].content).name).toBe('Alice');
  });

  it('extracts DOCX text via mammoth', async () => {
    const result = await readDoc(fixture('sample.docx'));
    expect(result.type).toBe('docx');
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('extracts every sheet from XLSX as CSV by default', async () => {
    const result = await readDoc(fixture('sample.xlsx'));
    expect(result.type).toBe('xlsx');
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    expect(result.chunks.map(c => c.source)).toEqual(
      expect.arrayContaining([expect.stringContaining('Sheet:')])
    );
  });

  it('limits XLSX to the first sheet when allSheets is false', async () => {
    const result = await readDoc(fixture('sample.xlsx'), { allSheets: false });
    expect(result.chunks).toHaveLength(1);
  });

  it('extracts slide text from PPTX', async () => {
    const result = await readDoc(fixture('sample.pptx'));
    expect(result.type).toBe('pptx');
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].source).toBe('Slide 1');
  });

  it('extracts text from a well-formed PDF', async () => {
    const result = await readDoc(fixture('sample-multipage.pdf'));
    expect(result.type).toBe('pdf');
    expect(result.content.length).toBeGreaterThan(1000);
    expect(result.warnings).toHaveLength(0);
  });

  it('splits PDF into per-page chunks when pageByPage is set', async () => {
    const result = await readDoc(fixture('sample-multipage.pdf'), { pageByPage: true });
    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.chunks[0].source).toBe('Page 1');
  });

  it('degrades gracefully instead of throwing on a PDF the parser cannot handle', async () => {
    const result = await readDoc(fixture('sample.pdf'));
    expect(result.type).toBe('pdf');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('lists ZIP contents without extracting by default', async () => {
    const result = await readDoc(fixture('sample.zip'));
    expect(result.type).toBe('zip');
    expect(result.content).toContain('Archive contents:');
    expect(result.content).toContain('sample.txt');
  });
});

describe('ExtractionOptions', () => {
  it('truncates content at maxChars and sets the truncated flag', async () => {
    const result = await readDoc(fixture('sample.md'), { maxChars: 20 });
    expect(result.truncated).toBe(true);
    expect(result.content.startsWith('# Doc Reader SDK')).toBe(true);
  });

  it('shares default options across repeated reads on the same DocReader instance', async () => {
    const reader = new DocReader({ allSheets: false });
    const result = await reader.read(fixture('sample.xlsx'));
    expect(result.chunks).toHaveLength(1);
  });

  it('lets per-call options override instance defaults', async () => {
    const reader = new DocReader({ allSheets: false });
    const result = await reader.read(fixture('sample.xlsx'), { allSheets: true });
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
  });
});
