export const EXTRACTOR_SYSTEM = `You extract structured data from resumes. Return only valid JSON matching this shape:
{
  "name": string,
  "domain_guess": string,
  "summary": string,
  "skills": string[],
  "experience": [{ "role": string, "org": string, "highlights": string[] }],
  "projects": [{ "title": string, "description": string, "tech": string[] }],
  "education": [{ "degree": string, "institution": string }]
}
Infer domain_guess as the single closest tech field (e.g. "Frontend Engineering", "Data Science & Machine Learning", "Competitive Programming & DSA"). If a field is missing from the resume, use an empty array or empty string. Do not invent facts not present in the resume text.`;

export function buildExtractorPrompt(resumeText) {
  return `Resume text extracted from PDF:\n\n"""${resumeText}"""\n\nExtract the structured profile as JSON.`;
}

export const GAP_SYSTEM = `You compare a candidate's resume profile against a target job description. Return only valid JSON matching this shape:
{
  "matchedSkills": string[],
  "missingSkills": string[],
  "alignmentNotes": string
}
Be specific and only reference skills that actually appear in the job description or resume.`;

export function buildGapPrompt(extraction, jobDescription) {
  return `Candidate profile:\n${JSON.stringify(extraction)}\n\nTarget job description:\n"""${jobDescription}"""\n\nCompare them and return the JSON.`;
}

export const RECOMMENDER_SYSTEM = `You are a career advisor for early-career software engineers and CS students. Using the candidate profile, retrieved domain knowledge, and optional job-description gap analysis, produce concrete, non-generic suggestions. Return only valid JSON matching this shape:
{
  "strengths": string[],
  "projectSuggestions": [{ "title": string, "why": string, "stack": string[] }],
  "skillsToLearn": [{ "skill": string, "why": string }],
  "overallRecommendations": string[]
}
Every suggestion must reference something specific from the candidate's actual resume or the retrieved domain knowledge, never generic filler like "learn communication skills". Suggest 3 projects, 3-5 skills, and 3-5 overall recommendations.`;

export function buildRecommenderPrompt(extraction, retrieved, jobDescription, gapAnalysis) {
  const kbContext = retrieved
    .map((r) => `- [${r.domain}] ${r.title}: ${r.content}`)
    .join("\n");

  let prompt = `Candidate profile:\n${JSON.stringify(extraction)}\n\nRetrieved domain knowledge (RAG context):\n${kbContext}\n\n`;

  if (jobDescription && jobDescription.trim().length > 0) {
    prompt += `Target job description:\n"""${jobDescription}"""\n\n`;
  }
  if (gapAnalysis) {
    prompt += `Gap analysis against the target role:\n${JSON.stringify(gapAnalysis)}\n\n`;
  }

  prompt += `Produce the JSON recommendation.`;
  return prompt;
}

export const CRITIC_SYSTEM = `You review a draft career recommendation for a resume analyzer. Tighten every suggestion so it is concrete and actionable, remove anything generic or repeated, and make sure each item ties back to something specific about the candidate. Keep the same JSON shape as the input, and add one field "summary": a 2-3 sentence overview of the candidate's profile and the single highest-leverage next step. Return only valid JSON.`;

export function buildCriticPrompt(recommendation, extraction) {
  return `Candidate name/domain: ${extraction.name || "the candidate"}, ${extraction.domain_guess || ""}\n\nDraft recommendation:\n${JSON.stringify(recommendation)}\n\nReturn the refined JSON.`;
}
