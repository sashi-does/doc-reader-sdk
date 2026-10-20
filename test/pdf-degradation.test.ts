import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Simulate pdf-parse throwing (e.g. on a malformed xref table) so we test
// extractPdf's own catch/degrade behavior deterministically, independent of
// whether any particular real-world PDF happens to trip the bundled parser's
// bugs on a given Node/V8 version.
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockRejectedValue(new Error('bad XRef entry')),
}));

import { extractPdf } from '../src/extractors/pdf.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(dirname, '..', 'test-fixtures', name);

describe('extractPdf graceful degradation', () => {
  it('catches a parser failure and returns a warning instead of throwing', async () => {
    const { chunks, warnings } = await extractPdf(fixture('sample.pdf'), {});
    expect(chunks).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('bad XRef entry');
  });
});
