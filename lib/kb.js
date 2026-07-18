import knowledgeBase from "../data/knowledge-base.json";
import { embedText } from "./gemini";

let cachedEmbeddings = null;

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getKBEmbeddings() {
  if (cachedEmbeddings) {
    return cachedEmbeddings;
  }
  const embeddings = [];
  for (const entry of knowledgeBase) {
    const vector = await embedText(`${entry.title}. ${entry.content}`, "RETRIEVAL_DOCUMENT");
    embeddings.push({ id: entry.id, vector });
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  cachedEmbeddings = embeddings;
  return cachedEmbeddings;
}

export async function retrieveRelevant(queryText, topK = 4) {
  const queryVector = await embedText(queryText, "RETRIEVAL_QUERY");
  const kbEmbeddings = await getKBEmbeddings();

  const scored = kbEmbeddings.map(({ id, vector }) => {
    const entry = knowledgeBase.find((k) => k.id === id);
    return {
      id,
      domain: entry.domain,
      title: entry.title,
      content: entry.content,
      score: cosineSimilarity(queryVector, vector)
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}