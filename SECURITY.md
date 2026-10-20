# Security Policy

## Reporting a vulnerability

Please report security issues privately via [GitHub Security Advisories](https://github.com/sashi-does/doc-reader-sdk/security/advisories/new) rather than filing a public issue. Include the affected version, a description of the issue, and reproduction steps if possible.

## Threat model

This SDK parses files whose contents you may not control (user uploads, documents from third parties, etc.). Extractors are written to degrade gracefully — returning a `warnings` entry instead of throwing — but parsing untrusted binary/compressed input always carries some risk of denial-of-service (e.g. decompression bombs, pathological regex backtracking) in the underlying parser libraries. If you accept files from untrusted sources, run extraction in a sandboxed/isolated process with memory and time limits, and do not pass `listOnly: false` for ZIP input you don't trust.

## Known transitive dependency advisories

As of this release, `npm audit` reports advisories in two transitive dependencies with no drop-in fix:

- **`xlsx` (SheetJS)** — the version published to the npm registry (`0.18.5`) has known prototype-pollution and ReDoS advisories ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)). SheetJS's patched releases are distributed from their own CDN rather than npm; we have not pinned to that CDN to keep installs reproducible from the public registry. Treat XLSX/XLS input from untrusted sources with the same caution as any other untrusted binary format.
- **`mammoth` → `argparse` → `sprintf-js`** — a moderate DoS advisory ([GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)) in a dependency used only by mammoth's own CLI argument parsing. doc-reader-sdk only calls `mammoth.extractRawText()` as a library and never exercises that code path.

We re-check these on every dependency bump and will pin a fix as soon as one is available upstream. PRs that responsibly replace either dependency (e.g. with a maintained fork) are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Supported versions

Only the latest published major version receives security fixes.
