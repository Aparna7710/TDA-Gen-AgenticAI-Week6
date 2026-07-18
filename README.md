# Clarity Resume

Final capstone for the AI summer school. You upload your resume as a PDF (and
optionally paste a job description), and it runs through a small pipeline of
agents that pull out your actual skills/projects, look them up against a
knowledge base, and hand back specific things to build or learn next instead
of the usual "improve your communication skills" filler.

Same UI direction as the rest of my Clarity series — purple, dark — but
softened it for this one: warmer plum instead of near-black, muted lavender
accent instead of neon, Fraunces for headings against Inter body text, soft
rounded cards instead of glass/blur. No stamps or gimmicks, just tried to
make it feel less like a templated dashboard.

## Live demo

`https://<your-vercel-url>.vercel.app`

## Running it locally

```bash
npm install
cp .env.example .env.local   # drop your GEMINI_API_KEY in here
npm run dev
```

Key's from [Google AI Studio](https://aistudio.google.com/apikey). Nothing
else to set up — no database, no vector store. The knowledge base is just a
JSON file and its embeddings get computed once on first request and kept in
memory after that.

## Deploying

1. Push to GitHub
2. Import into Vercel
3. Add `GEMINI_API_KEY` as an env var
4. Deploy, no config changes needed

Only thing worth flagging: `app/api/analyze/route.js` sets `maxDuration = 60`
because the pipeline makes 4 sequential model calls and the default 10s
timeout wasn't enough.

## How it actually works

The brief wanted as many bootcamp concepts as possible in one project, so
instead of one big prompt doing everything I split it into agents that each
do one job, with a retrieval step in the middle so the recommendations are
actually based on something instead of the model guessing.

Pipeline, in order:

1. **Parse** — `pdf-parse` pulls raw text out of the PDF. No model call yet.
2. **Extractor agent** — first LLM call. Turns the raw resume text into a
   strict JSON profile: skills, projects, experience, education, a guessed
   domain (frontend / ML / competitive programming / whatever).
3. **RAG retrieval** — I embed that profile (`gemini-embedding-001`) and
   compare it against a knowledge base I wrote by hand, 18 entries covering
   different tracks (frontend, backend, ML, DevOps, security, competitive
   programming, open source, etc.) with what's trending in each and what
   kind of projects actually stand out. Cosine similarity, top 4 matches get
   pulled in as context. This is the part that stops the model from just
   making up generic advice — it's reading from something concrete.
4. **Gap analyzer agent** — only runs if you paste a job description. Second
   LLM call, compares your profile against the JD: what matches, what's
   missing. This is the conditional branch in the workflow.
5. **Recommender agent** — third call. Given your profile + the retrieved
   knowledge base entries + the gap analysis if there is one, drafts the
   actual suggestions: projects, skills to learn, overall recommendations.
6. **Critic agent** — fourth call. Reads back the draft and cuts anything
   generic, makes sure every suggestion ties back to something specific in
   your resume or the retrieved context, and writes the final summary.

Each of these is its own system prompt in `lib/prompts.js`, not one prompt
trying to juggle everything — makes it way easier to debug when one part of
the output is bad, since I know exactly which step to blame.

Frontend (`app/page.js`) is one page: drop the PDF, optionally paste a JD,
watch a live step tracker while it runs, then get result cards for the
summary, fit against the target role (if given), projects, skills, and
recommendations. There's also a collapsible section showing the raw agent
trace and which KB entries got retrieved, mostly so it's obvious the RAG
step is actually doing something and not just decoration.

## Why some of the choices I made

- **Gemini for everything** (generation + embeddings) — same as the rest of
  the series, one API key, one thing to keep track of.
- **No vector DB** — the knowledge base is small and doesn't change, so
  keeping embeddings in memory is simpler than standing up a database for
  18 entries. Only cost is a few seconds on a cold start when it computes
  them the first time.
- **4 separate calls instead of 1 big prompt** — slower, but each step is
  independently checkable and I can swap out just the recommender or just
  the retrieval without breaking the rest.
- **pdf-parse instead of pdf.js** — pdf.js gave me ES module headaches on
  Vercel in an earlier project, pdf-parse's direct lib import has been
  solid.

## Stack

Next.js 14, App Router · Gemini API · pdf-parse · plain CSS, no framework ·
Vercel.
