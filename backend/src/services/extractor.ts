import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface ExtractedFile {
  name: string;
  text: string;
}

const TEXT_EXT = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".log",
  ".yaml",
  ".yml",
  ".html",
  ".htm",
  ".xml",
  ".org",
]);

export async function extractFile(filePath: string): Promise<ExtractedFile> {
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();
  if (TEXT_EXT.has(ext)) {
    const text = await fs.readFile(filePath, "utf8");
    return { name, text };
  }
  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    const pdf = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await pdf.getText();
      return { name, text: result.text };
    } finally {
      await pdf.destroy();
    }
  }
  if (ext === ".docx") {
    const buf = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: buf });
    return { name, text: result.value };
  }
  // fallback: try utf8
  const text = await fs.readFile(filePath, "utf8");
  return { name, text };
}

export async function extractFiles(paths: string[]): Promise<ExtractedFile[]> {
  const out: ExtractedFile[] = [];
  for (const p of paths) {
    try {
      out.push(await extractFile(p));
    } catch (err) {
      console.warn(`[extractor] failed ${p}:`, (err as Error).message);
      out.push({ name: path.basename(p), text: "" });
    }
  }
  return out;
}