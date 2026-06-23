# AI Writing Coach with Memory

A pedagogical AI-powered writing coach that helps users improve their English by remembering recurring mistakes, identifying patterns, and generating personalized lessons and quizzes.

**Stack:** React (Vite) + TypeScript + Tailwind CSS · Supabase (Auth + PostgreSQL + Edge Functions) · Gemini API

---

## Quick Start

### Prerequisites
- **Node.js 20+** ([download](https://nodejs.org))
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Docker Desktop** (required by Supabase local stack)

### Setup
```bash
# 1. Install dependencies
cd client
npm install

# 2. Copy environment variables
cd ..
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from `supabase status`

# 3. Start the Supabase local stack
npx supabase start

# 4. Run the dev server
npm run dev
```

App will be at **http://localhost:5173**.
Supabase Studio will be at **http://127.0.0.1:54323**.

---

## Project Structure

```
ai-writing-coach/
├── client/                 # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/     # Shared UI (layout + ui primitives)
│   │   ├── features/       # Feature-scoped pages (landing, workspace, ...)
│   │   ├── lib/            # Supabase client, theme, helpers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript contracts
│   │   └── routes/         # React Router configuration
│   └── package.json
├── supabase/               # Supabase config + Edge Functions
│   ├── functions/          # Deno-based serverless functions
│   └── migrations/         # Versioned SQL migrations
├── .env.example
└── package.json            # Root dev scripts
```

---

## Project Phases

| Phase | Status | Goal |
|---|---|---|
| **Phase 0** | 🟢 In progress | Project setup, design system, scaffolding |
| Phase 1 | ⚪ Pending | Supabase Auth (login/signup) |
| Phase 2 | ⚪ Pending | Gemini text analysis API |
| Phase 3 | ⚪ Pending | Mistake memory + repetition logic |
| Phase 4 | ⚪ Pending | Dashboard with stats & history |
| Phase 5 | ⚪ Pending | AI lesson generation |
| Phase 6 | ⚪ Pending | Adaptive quiz system |
| Phase 7 | ⚪ Pending | Notifications |
| Phase 8 | ⚪ Pending | Mastery system |
| Phase 9 | ⚪ Pending | Final polish |

---

## Architecture

The system is split into three layers:

1. **React client** — Vite SPA with React Router. Renders UI, calls Edge Functions via Supabase JS client.
2. **Supabase** — Auth, PostgreSQL (with RLS), and Deno Edge Functions. The `mistakes` table is the persistent memory that makes the app pedagogical.
3. **Gemini API** — Called **only from Edge Functions** (never directly from the browser). The API key is stored in Edge Function env vars.

### The AI Contract

The interface between Gemini and our app is locked in `client/src/types/analysis.ts`:

```typescript
interface AnalysisResponse {
  corrected_sentence: string;
  mistakes: Mistake[];
  explanation: string;
  accuracyScore: number;
  focusArea: string;
}
```

Every Edge Function, every React component, and every database column for `mistakes` references this type. Changing it later is expensive.

---

## Available Scripts

Run from the project root:

```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run typecheck    # tsc --noEmit
npm run db:start     # Start Supabase local stack
npm run db:stop      # Stop Supabase local stack
npm run db:reset     # Reset local database (drops all data, re-runs migrations)
npm run db:status    # Show Supabase service URLs and keys
```

---

## Phase 0 — What's In

✅ Project scaffold (Vite + React + TS + Tailwind)
✅ Design system (brand colors, Inter font, Lucide icons)
✅ Light + Dark theme toggle
✅ App shell (sidebar, top header, page transitions)
✅ Landing page (full port from HTML prototype)
✅ Route placeholders for all 5 app pages
✅ Supabase migration with `profiles`, `mistakes`, `analysis_logs` tables
✅ Row Level Security policies on every table
✅ Edge Function stubs for the three API endpoints
✅ TypeScript contracts for the AI engine

## Phase 0 — What's Out

- Real authentication (Phase 1)
- Real Gemini integration (Phase 2)
- Real mistake logging (Phase 3)
- Real stats (Phase 4)
