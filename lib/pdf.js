import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(buffer) {
  const result = await pdfParse(buffer);
  return result.text.replace(/\s+\n/g, "\n").trim();
}
