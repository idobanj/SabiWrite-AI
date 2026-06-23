# AI Writing Coach with Memory

A pedagogical AI-powered writing coach that helps users improve their English by remembering recurring mistakes, identifying patterns, and generating personalized lessons and quizzes.

**Stack:** React (Vite + JavaScript) + Tailwind CSS · Supabase (Auth + PostgreSQL + Edge Functions) · Gemini API

---

## Quick Start

### Prerequisites
- **Node.js 20+**
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Docker Desktop** (required by Supabase local stack)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from `supabase status`

# 3. Start the Supabase local stack (Postgres, Auth, Edge Functions, Studio)
npx supabase start

# 4. Run the dev server
npm run dev
```

App at **http://localhost:5173** · Supabase Studio at **http://127.0.0.1:54323**

---

## Project Structure (Standard Vite + Supabase)

```
ai-writing-coach/
├── public/                 # Static assets
├── src/
│   ├── components/         # Shared UI components
│   │   ├── AppShell.jsx    # Sidebar + TopHeader + Outlet
│   │   ├── Sidebar.jsx
│   │   ├── TopHeader.jsx
│   │   ├── PageTransition.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── IconBadge.jsx
│   │   ├── Pill.jsx
│   │   ├── StatCard.jsx
│   │   └── Toast.jsx
│   ├── pages/              # Route-level page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── WritingDesk.jsx
│   │   ├── ProgressDashboard.jsx
│   │   ├── PracticeModule.jsx
│   │   ├── HistoryPage.jsx
│   │   └── ProfilePage.jsx
│   ├── hooks/              # Custom React hooks
│   │   └── useTheme.js
│   ├── lib/                # Helpers, clients, types
│   │   ├── supabase.js
│   │   ├── theme.js
│   │   ├── cn.js
│   │   └── analysis.js     # JSDoc typedefs for the AI contract
│   ├── routes.jsx          # All routes defined here
│   ├── main.jsx            # Entry: BrowserRouter + ToastProvider
│   └── index.css           # Tailwind + custom utilities
├── supabase/               # Supabase config + Edge Functions
│   ├── functions/
│   │   ├── analyze-text/index.ts
│   │   ├── log-mistake/index.ts
│   │   └── user-stats/index.ts
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   └── config.toml
├── .env.example
└── package.json
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

Three layers:

1. **React client** — Vite SPA with React Router. Renders UI, calls Edge Functions via the Supabase JS client.
2. **Supabase** — Auth, PostgreSQL (with RLS), and Deno Edge Functions. The `mistakes` table is the persistent memory that makes the app pedagogical.
3. **Gemini API** — Called **only from Edge Functions** (never directly from the browser). The API key lives in Edge Function env vars.

### The AI Contract

The interface between Gemini and our app is locked in `src/lib/analysis.js` as JSDoc typedefs:

```js
/**
 * @typedef {Object} AnalysisResponse
 * @property {string} corrected_sentence
 * @property {Mistake[]} mistakes
 * @property {string} explanation
 * @property {number} accuracyScore
 * @property {string} focusArea
 */
```

Every Edge Function, every React component, and every database column for `mistakes` references this contract.

---

## Available Scripts

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview the production build locally
npm run lint         # oxlint
```