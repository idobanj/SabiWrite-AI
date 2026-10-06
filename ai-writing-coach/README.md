# SabiWrite AI — Your AI-Powered English Writing Coach

> Stop using software as a crutch. SabiWrite AI doesn't just fix your typos — it acts as an elite personal tutor, analyzing your weaknesses and generating dynamic lessons to elevate your communication.

🌐 **Live App:** [https://sabiwrite-ai.vercel.app](https://sabiwrite-ai.vercel.app)

---

## What It Does

SabiWrite AI is a pedagogical AI writing coach that:

- 📝 **Analyzes your writing** — detects grammar mistakes, subject-verb agreement errors, tense issues, and more
- 🧠 **Remembers your mistakes** — builds a personal mistake profile over time
- 📊 **Tracks your weaknesses** — shows patterns in your recurring errors via a progress dashboard
- 🎓 **Generates personalized lessons** — turns your weakest areas into interactive micro-lessons and quizzes
- 🏆 **Tracks your mastery** — rewards improvement with a mastery system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite + JavaScript) + Tailwind CSS |
| Auth & Database | Supabase (Auth + PostgreSQL + RLS) |
| AI | Google Gemini API (via Supabase Edge Functions) |
| Deployment | Vercel |

---

## Project Structure

```
ai-writing-coach/
├── public/                 # Static assets (sitemap, robots.txt, og-image)
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
│   │   ├── SignupPage.jsx
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
├── .github/workflows/      # GitHub Actions
│   └── supabase-keep-alive.yml
├── .env.example
└── package.json
```

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

---

## Local Development

### Prerequisites
- **Node.js 20+**
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Docker Desktop** (required by Supabase local stack)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/idobanj/SabiWrite-AI.git
cd SabiWrite-AI/ai-writing-coach

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Start the Supabase local stack
npx supabase start

# 5. Run the dev server
npm run dev
```

App at **http://localhost:5173** · Supabase Studio at **http://127.0.0.1:54323**

---

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ Never commit `.env` or `.env.supabase` — they are in `.gitignore`

---

## Available Scripts

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview the production build locally
npm run lint         # oxlint
```

---

## Features Status

| Feature | Status |
|---|---|
| Landing page with interactive demo | ✅ Live |
| Auth (login / signup / password reset) | ✅ Live |
| Writing Desk with AI analysis | ✅ Live |
| Mistake memory & pattern tracking | ✅ Live |
| Progress dashboard & stats | ✅ Live |
| Personalized lesson generation | ✅ Live |
| Adaptive quiz system | ✅ Live |
| Dark / light mode | ✅ Live |
| Google Search Console indexing | ✅ Done |
| Supabase keep-alive (GitHub Actions) | ✅ Done |

---

## License

MIT