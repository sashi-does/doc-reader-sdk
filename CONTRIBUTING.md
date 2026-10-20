# Contributing

Thanks for considering a contribution to doculens.

## Setup

```bash
git clone https://github.com/sashi-does/doc-reader-sdk.git
cd doc-reader-sdk
npm install
```

## Workflow

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest, assertion-based suite in test/
npm run test:smoke  # runs every fixture in test-fixtures/ through the CLI formatter
npm run build       # compiles src/ -> dist/
```

Run `npm test` and `npm run typecheck` before opening a PR — CI runs both on every push and PR.

## Adding support for a new format

1. Add the `DocType` value in `src/types/index.ts`.
2. Register its extension/magic bytes in `src/utils/helpers.ts` (`EXT_MAP` / `MAGIC`).
3. Add an extractor module under `src/extractors/` that returns `{ chunks: DocChunk[], warnings: string[] }`.
4. Wire it into the `switch` in `DocReader.read()` (`src/index.ts`).
5. Add a fixture under `test-fixtures/` and a test case in `test/extract.test.ts`.

## Guidelines

- Extractors should never throw for malformed-but-plausible input — catch parser errors and return a warning instead (see `src/extractors/pdf.ts` for the pattern).
- Keep extractors dependency-isolated: one format, one file, no cross-imports between extractors.
- No new dependency should be added without checking `npm audit` for its transitive tree.

## Reporting bugs

Open an issue with the file type, a minimal reproducing file (or a description of its structure if it can't be shared), and the error/warning you got.
