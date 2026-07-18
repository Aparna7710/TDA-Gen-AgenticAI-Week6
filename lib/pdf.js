import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/\s+\n/g, "\n").trim();
}
