import * as fs from 'fs';
import AdmZip from 'adm-zip';
import type { DocChunk } from '../types/index.js';

interface SimpleNode {
  type?: string;
  data?: string;
  name?: string;
  children?: SimpleNode[];
  attribs?: Record<string, string>;
}

function parseXmlNodes(xml: string): string[] {
  // Use regex to extract text content from XML text nodes
  // Extract content between tags, skipping tag-like content
  const texts: string[] = [];
  const re = />([^<]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t) texts.push(t);
  }
  return texts;
}

export async function extractPptx(
  filePath: string
): Promise<{ chunks: DocChunk[]; warnings: string[] }> {
  const warnings: string[] = [];
  const chunks: DocChunk[] = [];

  const buf = fs.readFileSync(filePath);
  const zip = new AdmZip(buf);

  const slideEntries = zip
    .getEntries()
    .filter((e: AdmZip.IZipEntry) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a: AdmZip.IZipEntry, b: AdmZip.IZipEntry) => {
      const numA = parseInt(a.entryName.match(/\d+/)![0]);
      const numB = parseInt(b.entryName.match(/\d+/)![0]);
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    warnings.push('No slides found in PPTX.');
    return { chunks, warnings };
  }

  for (let i = 0; i < slideEntries.length; i++) {
    const entry = slideEntries[i];
    const xml = entry.getData().toString('utf-8');
    const textNodes = parseXmlNodes(xml);
    const text = textNodes.join(' ').replace(/\s+/g, ' ').trim();
    chunks.push({ index: i, content: text, source: `Slide ${i + 1}` });
  }

  return { chunks, warnings };
}
