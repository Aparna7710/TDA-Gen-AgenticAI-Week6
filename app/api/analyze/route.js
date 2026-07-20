import { NextResponse } from "next/server";
import { extractPdfText } from "../../../lib/pdf";
import { generateJSON } from "../../../lib/gemini";
import { retrieveRelevant } from "../../../lib/kb";
import {
  EXTRACTOR_SYSTEM,
  buildExtractorPrompt,
  GAP_SYSTEM,
  buildGapPrompt,
  RECOMMENDER_SYSTEM,
  buildRecommenderPrompt
} from "../../../lib/prompts";

export const maxDuration = 60;

export async function POST(request) {
  const trace = [];
  const started = Date.now();
  const mark = (step, label, extra = {}) => {
    trace.push({ step, label, ms: Date.now() - started, ...extra });
  };

  try {
    const formData = await request.formData();
    const file = formData.get("resume");
    const jobDescription = (formData.get("jobDescription") || "").toString();

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "A resume PDF is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractPdfText(buffer);

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not read enough text from that PDF. Try a text-based (not scanned) resume." },
        { status: 400 }
      );
    }
    mark("parse", "Extracted text from the resume PDF");

    const extraction = await generateJSON(EXTRACTOR_SYSTEM, buildExtractorPrompt(resumeText));
    mark("extractor", `Parsed structured profile for ${extraction.name || "candidate"} (${extraction.domain_guess || "unknown domain"})`);

    const queryText = [extraction.summary, ...(extraction.skills || []), extraction.domain_guess]
      .filter(Boolean)
      .join(", ");
    const retrieved = await retrieveRelevant(queryText, 4);
    mark("retrieval", `Retrieved ${retrieved.length} relevant knowledge base entries`, {
      items: retrieved.map((r) => ({ title: r.title, score: Number(r.score.toFixed(3)) }))
    });

    let gapAnalysis = null;
    if (jobDescription.trim().length > 20) {
      gapAnalysis = await generateJSON(GAP_SYSTEM, buildGapPrompt(extraction, jobDescription));
      mark("gap_analysis", "Compared resume against the target job description");
    }

    const recommendation = await generateJSON(
      RECOMMENDER_SYSTEM,
      buildRecommenderPrompt(extraction, retrieved, jobDescription, gapAnalysis)
    );
    mark("recommender", "Generated project, skill, and improvement suggestions");

   const finalResult = recommendation;

    return NextResponse.json({
      extraction,
      retrieved,
      gapAnalysis,
      result: finalResult,
      trace
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
