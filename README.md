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

## Quick Start
```bash
# 1) Clone
git clone https://github.com/VolodymyrLinuxovich/CaserAI.git
cd CaserAI

# 2) Install
pnpm i
# or: npm i

# 3) Dev
pnpm dev
# or: npm run dev

# 4) Build / Start
pnpm build && pnpm start
# or: npm run build && npm start
```

### Minimal `.env.local`
```bash
# provider(s)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# app
NEXT_PUBLIC_APP_URL=http://localhost:3000
RAG_INDEX_DIR=public/cases
```

## Core Pieces

### AI Interviewer (route handler)
```ts
// app/api/case/next/route.ts
import { NextRequest } from "next/server";
import { askLLM } from "@/lib/ai";
import { buildPrompt } from "@/lib/prompts";
import { scoreTurn } from "@/lib/rubric";

export async function POST(req: NextRequest) {
  const { mode, history, rubric, caseId } = await req.json();

  // Optional: pull case context (RAG) from /public/cases
  // const ctx = await retrieveCaseSnippets(caseId, history);

  const prompt = buildPrompt({ mode, history /*, ctx */ });
  const reply = await askLLM(prompt, { stream: false });

  const turnScore = scoreTurn({ reply, rubric });
  return Response.json({ reply, turnScore });
}
```

### Rubric (dimensions & weights)
```ts
// lib/rubric.ts
export type Rubric = {
  structure: number;     // MECE, roadmap, hypotheses
  quant: number;         // math, units, checks
  assumptions: number;   // realism, defensibility
  synthesis: number;     // insights, recommendation, risks, next steps
  communication: number; // clarity, pace, listening
};

export const defaultWeights: Rubric = {
  structure: 0.25,
  quant: 0.25,
  assumptions: 0.20,
  synthesis: 0.20,
  communication: 0.10,
};
```

### Math helpers
```ts
// lib/math.ts
export const breakevenQty = (fixed: number, price: number, varCost: number) =>
  fixed / Math.max(1e-9, price - varCost);

export const cagr = (start: number, end: number, years: number) =>
  Math.pow(end / Math.max(1e-9, start), 1 / Math.max(1, years)) - 1;
```

### Case file format (Markdown/YAML)
id: "profitability-retail-001"
type: "profitability"
difficulty: "medium"
industry: "retail"
exhibits:
  - path: "exhibits/pnl.png"
learning_goals:
  - "Lay out a clean profitability tree"
  - "Run breakeven and sensitivity"

# Client
A national retailer with declining margins…

## Data
- Average ticket, traffic, gross margin %
- Fixed vs variable costs
- Recent price changes and promo cadence


## Typical Flows
1) Candidate-led:
   Intro → Clarify objective → Framework outline → Drive analyses → Synthesis

2) Interviewer-led:
   Short prompts → Targeted exhibits → Calculation checks → Final recommendation


## Security
• Do not commit secrets. Keep API keys in .env.local
• Call LLMs from server-side routes; avoid exposing keys in the browser
• Redact exported transcripts if they contain sensitive info


## Roadmap
[ ] Exhibit viewer with annotations & calculator overlay
[ ] Voice mode (STT/TTS) with interruption handling
[ ] Whiteboard + sticky notes for frameworks
[ ] CSV/JSON export of transcripts, scores, deltas
[ ] Practice plans & spaced repetition across case packs
