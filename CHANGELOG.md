# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Renamed the package from `doc-reader-sdk` to `doculens` (npm name, CLI binary, and all import examples). No API changes.

## [1.0.0] - 2026-10-20

### Added
- Initial public release.
- Extractors for PDF, DOCX/DOC, XLSX/XLS, PPTX/PPT, CSV/TSV, JSON/JSONL, plain text/Markdown/HTML/XML/RTF/EPUB, and ZIP listings.
- Type detection via file extension and magic-byte sniffing, with ZIP-container refinement for Office/EPUB formats.
- Streaming mode for text files over 10 MB.
- `maxChars` truncation, per-page/per-sheet/per-slide chunking, and structured warnings on partial extraction.
- CLI (`doculens`) with human-readable and `--json` output modes.
- Vitest test suite covering every supported format against the fixtures in `test-fixtures/`.

### Fixed
- `extractPdf` now catches parser failures (e.g. malformed xref tables from certain PDF generators) and returns a warning instead of throwing, matching the SDK's existing graceful-degradation behavior for scanned PDFs.
