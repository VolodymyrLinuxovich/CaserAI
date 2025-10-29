# CaserAI - AI Coach for Consulting Interviews

**About (1–2 sentences)**  
CaserAI is a **Next.js + TypeScript** starter focused on **consulting case interviews**. It gives you an AI interviewer, MECE frameworks, market-sizing calculators, and a structured scoring rubric—so you can spin up a realistic practice tool in hours, not weeks.

**Imagine**  
You open a page, choose “Profitability” or “Market Entry,” and an AI interviewer leads you through a candidate-led or interviewer-led case, probes your assumptions, checks your math, times your synthesis, and returns targeted feedback with next steps.


## What CaserAI Does
- **AI Interviewer Modes**: interviewer-led and candidate-led; switch mid-session.  
- **Frameworks Library**: MECE trees (profitability, market entry, pricing, ops, M&A) with prompts and checklists.  
- **Market Sizing & Math**: built-in calculator, units helpers, sanity checks, and estimation templates.  
- **Rubric-Based Scoring**: structure, assumptions, quantitative accuracy, insight/synthesis, communication, pacing.  
- **Drills**: quick prompts for graph reads, exhibits, breakeven, and sensitivity.  
- **Transcripts & Feedback**: auto-saved steps, red flags, and targeted recommendations.  
- **Content Packs**: plug in your own cases as Markdown/YAML and retrieve them via RAG.  
- **(Optional) Audio**: STT for live conversation; TTS for voice interviewer.


## Tech Stack
- **App**: Next.js (App Router) + TypeScript, React Server Components.
- **UI**: Tailwind CSS (+ optional shadcn/ui).
- **State**: React hooks/Zustand (optional).
- **AI**: OpenAI/Anthropic (pluggable provider), retrieval over local case files.
- **APIs**: Route Handlers under `app/api/*` (REST), stream support.
- **Build**: pnpm / npm; PostCSS; ESLint/Prettier.

## Repository Layout
```text
CaserAI/
├─ app/
│  ├─ (site)/            # marketing/landing (optional)
│  ├─ chat/page.tsx      # live interviewer UI
│  ├─ cases/page.tsx     # case library browser
│  ├─ review/[id]/page.tsx
│  └─ api/
│     ├─ case/start/route.ts   # start or resume a session
│     ├─ case/next/route.ts    # next prompt / exhibit
│     ├─ case/score/route.ts   # rubric scoring endpoint
│     └─ rag/search/route.ts   # retrieve snippets from case pack
├─ components/
│  ├─ CaseTree.tsx       # MECE tree builder
│  ├─ MathPad.tsx        # quick math & units helper
│  ├─ RubricCard.tsx     # scoring visualization
│  └─ Transcript.tsx
├─ hooks/
│  └─ useSessionStore.ts
├─ lib/
│  ├─ ai.ts              # provider-agnostic LLM client
│  ├─ prompts.ts         # system + tool prompts
│  ├─ rubric.ts          # scoring dimensions & weights
│  ├─ math.ts            # sizing helpers (breakeven, CAGR, etc.)
│  ├─ rag.ts             # simple local retrieval over /public/cases
│  └─ types.ts
├─ public/
│  └─ cases/             # your Markdown/YAML case files
├─ styles/
│  └─ globals.css
├─ scripts/
│  └─ ingest-cases.ts    # optional pre-index of case pack
├─ middleware.ts
├─ components.json       # if using shadcn/ui
├─ next.config.mjs
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ tsconfig.json
└─ README.md
