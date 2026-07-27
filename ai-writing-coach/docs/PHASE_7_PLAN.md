# Phase 0 — Project Setup Plan

## Context

We are building the **AI Writing Coach with Memory** — a React + Supabase pedagogical tool that helps users improve English by tracking recurring mistakes and generating personalized lessons/quizzes. The user's HTML prototype at `C:\Users\Olabanji Idowu\Desktop\English Writing Coach.html` defines the **visual design** (colors, layout, components, animations) and **interaction patterns** we are preserving.

**Decisions locked in this session:**
- **Path:** `C:\Users\Olabanji Idowu\Desktop\AI writing coach\ai-writing-coach\`
- **Auth model:** Landing page public, all app routes require sign-in (no anonymous "demo mode" — the HTML's localStorage mock engine is removed; Phase 1 introduces Supabase Auth, Phase 2 introduces real Gemini via Edge Functions)
- **Theming:** Light + Dark mode from Phase 0 (Tailwind `dark:` variant wired up now; only light mode fully designed per HTML, dark mode uses inverted/slate palette)
- **Source documents:** User has not shared the two `.docx` files. Working from the user-supplied summary + HTML prototype as the design system of record.

**Critical architectural shifts from the HTML prototype (apply now in Phase 0):**
1. Gemini API key is **never** in the browser. It lives in Edge Function env vars and is called server-side.
2. State (history, profile, stats) lives in Supabase, not `localStorage` or in-memory JS.
3. Auth is real (Supabase Auth), not the HTML's anonymous "Bola Alabi" hardcoded user.

---

## Phase 0 Deliverables

By the end of Phase 0, the developer can:
1. `git clone` → `npm install` → `supabase start` → `npm run dev`
2. See a styled landing page that matches the HTML (colors, fonts, components)
3. Click "Start Improving Now" → get redirected to `/login` (not yet implemented, but route exists)
4. The Supabase local stack runs with three tables created and RLS enabled
5. TypeScript types for the AI contract exist (used by Phase 2)

---

## Design System (Locked from HTML)

```js
// tailwind.config.js — color tokens from user's HTML
colors: {
  brand: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#5B5BF7', 600: '#4c4ce0', 700: '#3d3dbd' },
  correct: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
},
fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
borderRadius: { '3xl': '1.5rem', '2xl': '1rem' },
// Lucide icons (lucide-react npm package)
```

**Dark mode strategy:** Tailwind `class` strategy; toggle via `darkMode: 'class'`. Slate palette inverts to `slate-900`/`slate-800`/`slate-950` for backgrounds; cards become `slate-800` with `slate-700` borders. Brand `#5B5BF7` is preserved.

---

## Directory Structure

```
ai-writing-coach/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx          # sidebar + top header + outlet
│   │   │   │   ├── Sidebar.tsx           # HTML #sidebar (lines 90-147)
│   │   │   │   ├── TopHeader.tsx         # HTML #topHeader (153-179)
│   │   │   │   └── PageTransition.tsx    # page-fade-in animation
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx            # primary/secondary/ghost/danger
│   │   │   │   ├── Card.tsx              # rounded-3xl base + shadow variants
│   │   │   │   ├── Toast.tsx             # HTML #toastNotification (964-967)
│   │   │   │   ├── StatCard.tsx          # analytics card (522-565)
│   │   │   │   ├── Pill.tsx              # rounded-full badges
│   │   │   │   └── IconBadge.tsx         # colored icon containers
│   │   │   └── icons/
│   │   │       └── index.ts              # re-export lucide icons we use
│   │   ├── features/
│   │   │   ├── landing/LandingPage.tsx           # HTML #view-landing (185-320)
│   │   │   ├── auth/LoginPage.tsx                # Phase 1 (placeholder card)
│   │   │   ├── workspace/WritingDesk.tsx         # Phase 2 (placeholder)
│   │   │   ├── analytics/ProgressDashboard.tsx   # Phase 4 (placeholder)
│   │   │   ├── practice/PracticeModule.tsx       # Phase 5-6 (placeholder)
│   │   │   ├── history/HistoryPage.tsx           # Phase 4 (placeholder)
│   │   │   └── profile/ProfilePage.tsx           # Phase 1 (placeholder)
│   │   ├── lib/
│   │   │   ├── supabase.ts              # createClient<Database>
│   │   │   ├── theme.ts                 # dark mode toggle logic
│   │   │   └── cn.ts                    # clsx + tailwind-merge helper
│   │   ├── hooks/
│   │   │   └── useTheme.ts              # dark mode hook
│   │   ├── types/
│   │   │   ├── analysis.ts              # Mistake, AnalysisResponse, UserStats
│   │   │   └── database.ts              # Supabase generated types (manual stub in P0)
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.tsx       # Phase 1 (renders children; placeholder)
│   │   │   └── AppRoutes.tsx            # all 6 routes
│   │   ├── App.tsx                      # BrowserRouter + ThemeProvider
│   │   ├── main.tsx                     # entry
│   │   └── index.css                    # tailwind directives + custom CSS
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html                       # Inter font preconnect, dark mode flash prevention
│   └── package.json
│
├── supabase/
│   ├── functions/
│   │   ├── analyze-text/index.ts        # stub: returns mock JSON
│   │   ├── log-mistake/index.ts         # stub
│   │   └── user-stats/index.ts          # stub
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   ├── config.toml
│   └── seed.sql                         # optional: one demo user
│
├── .env.example
├── .gitignore
├── README.md
└── package.json                          # root: dev scripts
```

---

## Files to Create (Phase 0)

### Root
- **`README.md`** — setup instructions: Node 20, Supabase CLI, `npm install`, `supabase start`, `npm run dev`
- **`.env.example`** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **`.gitignore`** — `node_modules`, `dist`, `.env`, `supabase/.branches`, `supabase/.temp`
- **`package.json`** (root) — scripts: `dev`, `db:start`, `db:stop`, `db:reset`

### Client Config
- **`client/package.json`** — deps: `react@18`, `react-dom@18`, `react-router-dom@6`, `@supabase/supabase-js@2`, `lucide-react`, `clsx`, `tailwind-merge`, `zod`
- **`client/vite.config.ts`** — `@vitejs/plugin-react`, path alias `@/`
- **`client/tsconfig.json`** — strict mode, `paths: { "@/*": ["./src/*"] }`
- **`client/tailwind.config.js`** — brand colors, Inter, dark mode `class`, content globs
- **`client/postcss.config.js`** — tailwind + autoprefixer
- **`client/index.html`** — `<html class="h-full">`, Inter preconnect, dark mode flash prevention script
- **`client/src/index.css`** — `@tailwind base/components/utilities`, custom-scrollbar styles, error-underline, correct-highlight, page-fade-in (copy from HTML lines 38-83)

### Client Source
- **`client/src/main.tsx`** — render `<App />` in `<StrictMode>`
- **`client/src/App.tsx`** — `BrowserRouter`, `ThemeProvider`, `AuthProvider` (stub), `ToastProvider` (stub), `AppRoutes`
- **`client/src/lib/cn.ts`** — `cn(...inputs: ClassValue[]) => twMerge(clsx(inputs))`
- **`client/src/lib/supabase.ts`** — `createClient(supabaseUrl, supabaseAnonKey)` with env validation
- **`client/src/lib/theme.ts`** — read/write `localStorage.theme` + `document.documentElement.classList`
- **`client/src/hooks/useTheme.ts`** — exposes `{ theme, toggle }`
- **`client/src/types/analysis.ts`** — see contract below
- **`client/src/types/database.ts`** — manual stub matching migration columns (Supabase generates real types via `supabase gen types typescript`)

### Layout Components
- **`components/layout/AppShell.tsx`** — flex container; renders `<Sidebar />` + `<main>` with `<TopHeader />` + `<Outlet />`. Hides both on `/` (landing) route.
- **`components/layout/Sidebar.tsx`** — direct React port of HTML #sidebar (90-147). Brand logo, nav links (Writing Desk, Progress Stats, Practice Path, Writing History, My Account, plus a placeholder for "Gemini API Key" → removed), user footer card. Active link highlighting via React Router `useLocation`.
- **`components/layout/TopHeader.tsx`** — direct React port of HTML #topHeader (153-179). Page title/subtitle map, settings button, user widget, mobile menu button.
- **`components/layout/PageTransition.tsx`** — wraps `<Outlet />` with `page-fade-in` animation class

### UI Components
- **`components/ui/Button.tsx`** — variants: `primary` (brand-500), `secondary` (slate), `ghost` (transparent), `danger` (error). Sizes: `sm`, `md`, `lg`. Pill vs square toggle.
- **`components/ui/Card.tsx`** — `rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm`. Optional `interactive` prop adds hover.
- **`components/ui/Toast.tsx`** — context-based system. Port of HTML #toastNotification (1936-1948).
- **`components/ui/StatCard.tsx`** — port of HTML analytics stat cards (522-565)
- **`components/ui/Pill.tsx`** — port of HTML pill badges
- **`components/ui/IconBadge.tsx`** — colored icon container (HTML uses this pattern 18+ times, e.g. line 287)

### Features
- **`features/landing/LandingPage.tsx`** — full React port of HTML #view-landing (185-320). Static. Includes: hero section, interactive demo textarea (visual only — no analysis yet), 4-column value props, footer. All buttons navigate to `/login` (Phase 1) or `/app/workspace` (when authed).
- **`features/auth/LoginPage.tsx`** — placeholder card: "Phase 1: Authentication. Form coming in the next phase." with a "Back to home" link. Centered layout.
- **`features/workspace/WritingDesk.tsx`** — placeholder card
- **`features/analytics/ProgressDashboard.tsx`** — placeholder card
- **`features/practice/PracticeModule.tsx`** — placeholder card
- **`features/history/HistoryPage.tsx`** — placeholder card
- **`features/profile/ProfilePage.tsx`** — placeholder card

### Routes
- **`routes/AppRoutes.tsx`** — defines all 6 routes
- **`routes/ProtectedRoute.tsx`** — Phase 1 stub: reads auth context, redirects to `/login` if not authed. For Phase 0, always returns `<Outlet />` (no real auth check) but the component is wired up.

### Supabase
- **`supabase/migrations/0001_initial_schema.sql`** — three tables (`profiles`, `mistakes`, `analysis_logs`) + RLS policies. See schema below.
- **`supabase/functions/analyze-text/index.ts`** — Phase 2 stub: Deno edge function that returns `AnalysisResponse` (mock data) for any POST
- **`supabase/functions/log-mistake/index.ts`** — Phase 3 stub
- **`supabase/functions/user-stats/index.ts`** — Phase 4 stub
- **`supabase/config.toml`** — defaults; project name
- **`supabase/seed.sql`** — optional: one demo user with profile

---

## TypeScript Contract (Phase 0 → used in Phase 2)

`client/src/types/analysis.ts`:

```typescript
export type MistakeType =
  | "subject_verb_agreement"
  | "tense"
  | "article"
  | "preposition"
  | "word_choice"
  | "spelling"
  | "punctuation"
  | "sentence_structure"
  | "other";

export interface Mistake {
  id?: string;
  type: MistakeType;
  wrong_text: string;
  correct_text: string;
  start_index?: number;
  end_index?: number;
  explanation: string;            // pedagogical
  tip?: string;                    // short diagnostic tip
  // Optional fields from HTML localAnalysisDb (Phase 2 schema flex)
  contextSentenceWithError?: string;  // HTML-marked sentence
  correctedSentence?: string;
  category?: string;                 // human-readable category
}

export interface AnalysisResponse {
  corrected_sentence: string;
  mistakes: Mistake[];
  explanation: string;             // overall coaching note
  accuracyScore: number;           // 0-100
  focusArea: string;
}

export interface UserStats {
  total_submissions: number;
  total_mistakes: number;
  top_mistake_types: { type: MistakeType; count: number }[];
  improvement_trend: number;       // -1.0 to 1.0
  accuracy: number;                // 0-100
  lessons_completed: number;
}

export interface HistoryLog {
  id: string;
  user_id: string;
  original_text: string;
  corrected_text: string;
  mistake_count: number;
  accuracy_score: number;
  created_at: string;
}
```

Note: the user's HTML prototype uses `correctedText`/`errors`/`accuracyScore`/`focusArea` (camelCase). The plan deliberately uses snake_case to match the Supabase column names — we'll map at the Edge Function boundary. The interface matches what Gemini will return.

---

## Database Schema (Phase 0)

`supabase/migrations/0001_initial_schema.sql`:

```sql
-- App-specific user data (auth.users is managed by Supabase)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  native_language text,
  target_goal text,
  school text,
  cgpa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- The heart of the app: persistent mistake memory
create table public.mistakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mistake_type text not null,
  wrong_text text not null,
  correct_text text not null,
  explanation text,
  tip text,
  frequency_count int default 1,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  resolved boolean default false
);

-- Raw analysis history for stats and trends
create table public.analysis_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  original_text text not null,
  corrected_text text not null,
  mistake_count int default 0,
  accuracy_score int default 0,
  focus_area text,
  created_at timestamptz default now()
);

-- Indexes for fast user-scoped queries
create index mistakes_user_id_idx on public.mistakes(user_id);
create index analysis_logs_user_id_idx on public.analysis_logs(user_id);
create index analysis_logs_created_at_idx on public.analysis_logs(created_at desc);

-- Row Level Security (enable immediately; no exceptions)
alter table public.profiles enable row level security;
alter table public.mistakes enable row level security;
alter table public.analysis_logs enable row level security;

create policy "Users see own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users see own mistakes" on public.mistakes
  for select using (auth.uid() = user_id);
create policy "Users insert own mistakes" on public.mistakes
  for insert with check (auth.uid() = user_id);
create policy "Users update own mistakes" on public.mistakes
  for update using (auth.uid() = user_id);

create policy "Users see own history" on public.analysis_logs
  for select using (auth.uid() = user_id);
create policy "Users insert own history" on public.analysis_logs
  for insert with check (auth.uid() = user_id);
```

---

## Environment Variables

`.env.example` at root:
```bash
# Frontend (Vite — must be prefixed VITE_)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJ...   # from `supabase status`

# Edge Functions (NEVER prefix with VITE_; not exposed to browser)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # server-only
GEMINI_API_KEY=                   # ADDED IN PHASE 2
```

---

## Phase 0 Out of Scope

To keep Phase 0 tight, the following are explicitly **not** included:
- ❌ Real Supabase Auth (Phase 1)
- ❌ Real Gemini integration (Phase 2 — `GEMINI_API_KEY` env var stays empty)
- ❌ Real mistake logging (Phase 3)
- ❌ Real stats computation (Phase 4)
- ❌ Quiz generation logic (Phase 5-6)
- ❌ Notifications (Phase 7)
- ❌ Mastery system (Phase 8)
- ❌ Deployment (post-Phase 9)
- ❌ Dark mode design polish (theme infrastructure is in; visual design refinement comes later)
- ❌ The "Gemini API Key Sandbox" modal from the HTML (permanently removed — server-side key)

---

## Verification

After scaffolding, verify with these steps:

1. **Install + dev server up**
   ```bash
   cd "C:\Users\Olabanji Idowu\Desktop\AI writing coach\ai-writing-coach"
   npm install
   cd client && npm install
   cd .. && npm run dev
   # → Vite running on http://localhost:5173
   ```

2. **Landing page renders**
   - Navigate to `http://localhost:5173/`
   - Hero text: "Your AI-Powered English Writing Coach" with brand-500 highlight
   - Hero badge: "Live EdTech Prototype v1.5" with ping animation
   - Interactive demo textarea visible (no submit behavior yet)
   - 4-column value props with colored icon badges
   - Footer: "© 2026 English Error Coach"

3. **Theme toggle**
   - Click theme toggle in (eventual) TopHeader → page background switches slate-50 ↔ slate-900
   - Refresh → preference persists

4. **Supabase local stack**
   ```bash
   npx supabase start
   # → Studio at http://127.0.0.1:54323
   # → Postgres at 127.0.0.1:54322
   ```
   - Open Studio → confirm `profiles`, `mistakes`, `analysis_logs` tables exist
   - Each table shows RLS enabled

5. **Routes work**
   - `/` → Landing
   - `/login` → "Phase 1: Authentication" placeholder
   - `/app/workspace` → "Phase 2: Writing Desk" placeholder
   - `/app/analytics` → "Phase 4: Progress Dashboard" placeholder
   - `/app/focus` → "Phase 5-6: Practice Module" placeholder
   - `/app/history` → "Phase 4: History" placeholder
   - `/app/profile` → "Phase 1: Profile" placeholder
   - Sidebar hidden on `/`, visible on `/app/*`
   - Active sidebar link highlighted based on current route

6. **TypeScript clean**
   ```bash
   cd client && npx tsc --noEmit
   # → no errors
   ```

7. **Build**
   ```bash
   cd client && npm run build
   # → dist/ generated, no errors
   ```

---

## Critical Files Reference (for review after scaffolding)

- `client/tailwind.config.js` — color tokens must match HTML exactly
- `client/src/index.css` — custom CSS classes (custom-scrollbar, error-underline, correct-highlight, page-fade-in) ported from HTML lines 38-83
- `client/src/components/layout/Sidebar.tsx` — must visually match HTML #sidebar
- `client/src/components/layout/TopHeader.tsx` — must visually match HTML #topHeader
- `client/src/features/landing/LandingPage.tsx` — must visually match HTML #view-landing
- `supabase/migrations/0001_initial_schema.sql` — schema + RLS
- `client/src/types/analysis.ts` — AI contract
