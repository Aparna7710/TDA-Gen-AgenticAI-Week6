const GENERATION_MODEL = "gemini-flash-latest";
const EMBEDDING_MODEL = "gemini-embedding-001";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(json)?/, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const isNetworkError = err.cause && ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(err.cause.code);
      if (isLastAttempt || !isNetworkError) {
        throw err;
      }
      await sleep(400 * attempt);
    }
  }
}

export async function generateJSON(systemPrompt, userPrompt, temperature = 0.4) {
  const apiKey = getApiKey();
  const res = await fetchWithRetry(`${BASE_URL}/${GENERATION_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

  if (!text) {
    throw new Error("Gemini returned no content, the resume text may have triggered a safety filter");
  }

  try {
    return JSON.parse(stripCodeFence(text));
  } catch (err) {
    throw new Error(`Failed to parse model JSON output: ${err.message}`);
  }
}

export async function embedText(text, taskType = "RETRIEVAL_DOCUMENT") {
  const apiKey = getApiKey();
  const res = await fetchWithRetry(`${BASE_URL}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
      outputDimensionality: 768
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedContent failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.embedding.values;
}