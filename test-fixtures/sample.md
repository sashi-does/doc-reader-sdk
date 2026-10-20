# Doc Reader SDK

## Features
- PDF extraction
- DOCX extraction
- XLSX extraction
- PPTX extraction
- CSV/TSV support
- JSON/JSONL support

## Usage
```typescript
import { readDoc } from 'doc-reader-sdk';
const result = await readDoc('file.pdf');
console.log(result.content);
```
