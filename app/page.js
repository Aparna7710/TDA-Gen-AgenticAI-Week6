"use client";

import { useRef, useState, useEffect } from "react";

const LOADING_STEPS_BASE = [
  "Reading the PDF",
  "Extracting skills, projects, experience",
  "Retrieving relevant knowledge base entries",
  "Drafting recommendations",
  "Cutting anything generic"
];

const LOADING_STEPS_WITH_JD = [
  "Reading the PDF",
  "Extracting skills, projects, experience",
  "Retrieving relevant knowledge base entries",
  "Comparing against the target role",
  "Drafting recommendations",
  "Cutting anything generic"
];

export default function Home() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const inputRef = useRef(null);

  const steps = jobDescription.trim().length > 20 ? LOADING_STEPS_WITH_JD : LOADING_STEPS_BASE;

  useEffect(() => {
    if (!loading) return;
    setActiveStep(0);
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  function handleFileSelect(f) {
    if (f && f.type === "application/pdf") {
      setFile(f);
      setError("");
    } else {
      setError("That's not a PDF. Export your resume as one and try again.");
    }
  }

  async function handleSubmit() {
    if (!file) {
      setError("Drop a resume in first.");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);
    if (jobDescription.trim().length > 0) {
      formData.append("jobDescription", jobDescription.trim());
    }

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Analysis failed");
      }
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="masthead">
        <span className="masthead-dot" />
        Clarity Resume
      </div>

      <div className="hero">
        <h1>What should you actually work on next?</h1>
        <svg className="underline" viewBox="0 0 84 8" fill="none">
          <path
            d="M2 5.5C14 1.5 24 1.5 32 4.5C40 7.5 50 7.5 58 4C66 0.5 74 1 82 4"
            stroke="var(--warm)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p>
          Drop in your resume and it'll pull out what's actually on there, check it
          against a knowledge base of what stands out in your field, and hand back
          specific projects and skills worth your time. Nothing generic. Nothing to waste your time.
        </p>
      </div>

      <div className="intake">
        <label
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFileSelect(e.dataTransfer.files[0]);
          }}
        >
          <div className="dropzone-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="dropzone-title">{file ? "Change resume" : "Drop your resume here"}</div>
            <div className="dropzone-sub">or click to browse — PDF only</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </label>

        {file && <div className="file-chip">{file.name}</div>}

        <button className="jd-toggle" onClick={() => setShowJD((v) => !v)}>
          {showJD ? "− Hide target role" : "+ Compare against a specific job description"}
        </button>

        {showJD && (
          <textarea
            placeholder="Paste the job description you're aiming for"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        )}

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Reviewing…" : "Review my resume"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="trace-panel">
          <div className="trace-title">Working through it</div>
          {steps.map((label, i) => (
            <div
              key={label}
              className={`trace-step${i === activeStep ? " active" : ""}${i < activeStep ? " done" : ""}`}
            >
              <span className="trace-marker" />
              {label}
            </div>
          ))}
        </div>
      )}

      {data && <Results data={data} />}

      <div className="footer-note">Built for the TDA AI summer school</div>
    </main>
  );
}

function Results({ data }) {
  const { result, retrieved, gapAnalysis, extraction, trace } = data;

  return (
    <div className="results">
      <div className="result-card">
        <h2>Summary</h2>
        <p className="summary-text">{result.summary}</p>
        {result.strengths && result.strengths.length > 0 && (
          <div className="chip-row">
            {result.strengths.map((s, i) => (
              <span className="chip" key={i}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {gapAnalysis && (
        <div className="result-card">
          <h2>Fit against the target role</h2>
          <div className="two-col">
            <div>
              <div className="suggestion-title">Matched</div>
              <div className="chip-row" style={{ marginTop: 0 }}>
                {gapAnalysis.matchedSkills.map((s, i) => (
                  <span className="chip" key={i}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="suggestion-title">Missing</div>
              <div className="chip-row" style={{ marginTop: 0 }}>
                {gapAnalysis.missingSkills.map((s, i) => (
                  <span className="chip" key={i}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="summary-text" style={{ marginTop: 16 }}>{gapAnalysis.alignmentNotes}</p>
        </div>
      )}

      <div className="result-card">
        <h2>Projects worth building</h2>
        {result.projectSuggestions.map((p, i) => (
          <div className="suggestion" key={i}>
            <div className="suggestion-title">{p.title}</div>
            <div className="suggestion-why">{p.why}</div>
            <div className="chip-row" style={{ marginTop: 0 }}>
              {p.stack.map((t, j) => (
                <span className="chip" key={j}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="result-card">
        <h2>Skills to sharpen</h2>
        {result.skillsToLearn.map((s, i) => (
          <div className="suggestion" key={i}>
            <div className="suggestion-title">{s.skill}</div>
            <div className="suggestion-why">{s.why}</div>
          </div>
        ))}
      </div>

      <div className="result-card">
        <h2>Overall recommendations</h2>
        <ul className="list-plain">
          {result.overallRecommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <details className="result-card trace-detail">
        <summary>Agent trace & retrieved context</summary>
        <div style={{ marginTop: 16 }}>
          <div className="suggestion-title">Pipeline</div>
          <ul className="trace-log">
            {trace.map((t, i) => (
              <li key={i}>{t.label} — {t.ms}ms</li>
            ))}
          </ul>
          <div className="suggestion-title" style={{ marginTop: 16 }}>Retrieved knowledge base entries</div>
          <ul className="trace-log">
            {retrieved.map((r, i) => (
              <li key={i}>{r.title} — similarity {r.score.toFixed(3)}</li>
            ))}
          </ul>
          <div className="suggestion-title" style={{ marginTop: 16 }}>Extracted skills</div>
          <div className="chip-row" style={{ marginTop: 8 }}>
            {extraction.skills.map((s, i) => (
              <span className="chip" key={i}>{s}</span>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
